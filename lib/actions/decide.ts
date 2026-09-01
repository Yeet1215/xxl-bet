'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, isNull } from 'drizzle-orm'

import { db } from '@/lib/db'
import { bets, boards, decideRequests, rounds, type Board } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth/session'
import { getBoardForUser } from '@/lib/queries/boards'
import { ensureRound } from '@/lib/queries/rounds'
import { parseBetValue } from '@/lib/validators/bets'
import { decideRoundSchema, requestIdSchema } from '@/lib/validators/decide'
import { nowMinutesInTz, todayInTz } from '@/lib/utils/tz'
import { scoreRound } from '@/lib/scoring'

export type DecideActionState = { error: string } | { ok: true } | undefined

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * Core resolve, transaction-scoped (security review: a crash mid-scoring must
 * not leave a "decided" round with unscored bets): claim the round, recompute
 * every bet's score (the engine is pure + idempotent, so re-deciding just
 * overwrites), and auto-deny still-pending decide requests (moot once
 * decided). With `onlyIfUndecided` the claim is conditional — the loser of a
 * concurrent double-approve gets `false` instead of double-applying.
 */
async function applyOutcomeCore(
  tx: Tx,
  board: Board,
  roundId: string,
  outcome: number,
  decidedById: string,
  onlyIfUndecided: boolean,
): Promise<boolean> {
  const claimed = await tx
    .update(rounds)
    .set({ outcomeValue: outcome, decidedAt: new Date(), decidedById })
    .where(
      onlyIfUndecided
        ? and(eq(rounds.id, roundId), isNull(rounds.outcomeValue))
        : eq(rounds.id, roundId),
    )
    .returning({ id: rounds.id })
  if (claimed.length === 0) return false

  const betRows = await tx
    .select({ userId: bets.userId, betValue: bets.betValue })
    .from(bets)
    .where(eq(bets.roundId, roundId))

  const scored = scoreRound(betRows, outcome, board)
  // Per-row updates — fine at office scale (≤ ~20 bets/round); batch to a
  // single CASE update if boards ever grow beyond that.
  for (const result of scored) {
    await tx
      .update(bets)
      .set({
        score: result.score,
        diffMinutes: result.diff,
        isClosest: result.isClosest,
        isExact: result.isExact,
      })
      .where(and(eq(bets.roundId, roundId), eq(bets.userId, result.userId)))
  }

  await tx
    .update(decideRequests)
    .set({ status: 'denied', reviewedAt: new Date(), reviewedById: decidedById })
    .where(and(eq(decideRequests.roundId, roundId), eq(decideRequests.status, 'pending')))

  return true
}

// Owner decides (or RE-decides — fixing a wrong outcome recomputes scores).
// Deciding before lock time is allowed and acts as "close the bet early":
// placeBet refuses decided rounds.
export async function decideRound(
  _prev: DecideActionState,
  formData: FormData,
): Promise<DecideActionState> {
  const user = await requireUser()

  const parsed = decideRoundSchema.safeParse({
    boardId: formData.get('boardId'),
    roundDate: formData.get('roundDate'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }
  const { boardId, roundDate } = parsed.data

  const row = await getBoardForUser(boardId, user.id)
  if (!row || !row.membership) return { error: 'Board not found' }
  const { board } = row
  if (board.ownerId !== user.id) return { error: 'Only the board owner can decide' }

  // No deciding the future.
  if (roundDate > todayInTz(board.timezone)) return { error: 'That round hasn’t happened yet' }

  const parsedValue = parseBetValue(board.betType, formData.get('outcomeValue'))
  if ('error' in parsedValue) return { error: parsedValue.error }

  const round = await ensureRound(boardId, roundDate)
  if (!round) return { error: 'Could not open the round' }

  // Owner decide/re-decide is unconditional (single trusted human).
  await db.transaction((tx) =>
    applyOutcomeCore(tx, board, round.id, parsedValue.value, user.id, false),
  )

  revalidatePath(`/board/${boardId}`)
  return { ok: true }
}

// Member proposes the outcome ("Request to decide") — post-lock, undecided
// rounds only; one pending request per member per round (a denied request may
// be re-submitted).
export async function submitDecideRequest(
  _prev: DecideActionState,
  formData: FormData,
): Promise<DecideActionState> {
  const user = await requireUser()

  const parsed = decideRoundSchema.safeParse({
    boardId: formData.get('boardId'),
    roundDate: formData.get('roundDate'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }
  const { boardId, roundDate } = parsed.data

  const row = await getBoardForUser(boardId, user.id)
  if (!row || !row.membership) return { error: 'Board not found' }
  const { board } = row

  const today = todayInTz(board.timezone)
  if (roundDate > today) return { error: 'That round hasn’t happened yet' }
  const locked = roundDate < today || nowMinutesInTz(board.timezone) >= board.lockTimeMinutes
  if (!locked) return { error: 'Wait until bets lock before proposing the outcome' }

  const parsedValue = parseBetValue(board.betType, formData.get('outcomeValue'))
  if ('error' in parsedValue) return { error: parsedValue.error }

  const round = await ensureRound(boardId, roundDate)
  if (!round) return { error: 'Could not open the round' }
  if (round.outcomeValue !== null) return { error: 'This round is already decided' }

  // Update my pending request if I have one, else create it.
  const [existing] = await db
    .select({ id: decideRequests.id })
    .from(decideRequests)
    .where(
      and(
        eq(decideRequests.roundId, round.id),
        eq(decideRequests.requesterId, user.id),
        eq(decideRequests.status, 'pending'),
      ),
    )
    .limit(1)
  if (existing) {
    await db
      .update(decideRequests)
      .set({ proposedOutcomeValue: parsedValue.value, createdAt: new Date() })
      .where(eq(decideRequests.id, existing.id))
  } else {
    try {
      await db.insert(decideRequests).values({
        roundId: round.id,
        requesterId: user.id,
        proposedOutcomeValue: parsedValue.value,
      })
    } catch (err) {
      // Concurrent double-submit trips the one-pending partial unique index —
      // a pending request now exists, which is what the user wanted.
      const message = err instanceof Error ? err.message : String(err)
      if (!message.includes('decide_requests_pending_idx')) throw err
    }
  }

  revalidatePath(`/board/${boardId}`)
  return { ok: true }
}

/**
 * Owner review of a decide request. Loads request → round → board in one
 * ownership-checked join; approve applies the proposed outcome (and
 * auto-denies the other pending requests), deny just closes this one.
 */
async function reviewDecideRequest(
  requestId: unknown,
  verdict: 'approved' | 'denied',
): Promise<{ error?: string }> {
  const user = await requireUser()

  const parsedId = requestIdSchema.safeParse(requestId)
  if (!parsedId.success) return { error: 'Request not found' }

  const [row] = await db
    .select({ request: decideRequests, round: rounds, board: boards })
    .from(decideRequests)
    .innerJoin(rounds, eq(decideRequests.roundId, rounds.id))
    .innerJoin(boards, eq(rounds.boardId, boards.id))
    .where(eq(decideRequests.id, parsedId.data))
    .limit(1)

  if (!row || row.board.ownerId !== user.id) return { error: 'Request not found' }
  if (row.request.status !== 'pending') return { error: 'Request was already reviewed' }
  if (row.round.outcomeValue !== null) return { error: 'This round is already decided' }

  if (verdict === 'approved') {
    // One transaction: claim-first (onlyIfUndecided) so two concurrent
    // approvals can't both apply — the loser reports instead of double-scoring.
    const applied = await db.transaction(async (tx) => {
      const ok = await applyOutcomeCore(
        tx,
        row.board,
        row.round.id,
        row.request.proposedOutcomeValue,
        user.id,
        true,
      )
      if (!ok) return false
      // Flip THIS request to approved (applyOutcomeCore just auto-denied all
      // pending ones for the round, including it).
      await tx
        .update(decideRequests)
        .set({ status: 'approved', reviewedAt: new Date(), reviewedById: user.id })
        .where(eq(decideRequests.id, row.request.id))
      return true
    })
    if (!applied) return { error: 'This round was already decided' }
  } else {
    await db
      .update(decideRequests)
      .set({ status: 'denied', reviewedAt: new Date(), reviewedById: user.id })
      .where(and(eq(decideRequests.id, row.request.id), eq(decideRequests.status, 'pending')))
  }

  revalidatePath(`/board/${row.board.id}`)
  return {}
}

export async function approveDecideRequest(requestId: unknown): Promise<{ error?: string }> {
  return reviewDecideRequest(requestId, 'approved')
}

export async function denyDecideRequest(requestId: unknown): Promise<{ error?: string }> {
  return reviewDecideRequest(requestId, 'denied')
}
