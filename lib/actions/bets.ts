'use server'

import { revalidatePath } from 'next/cache'

import { db } from '@/lib/db'
import { bets } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth/session'
import { getBoardForUser } from '@/lib/queries/boards'
import { ensureRound } from '@/lib/queries/rounds'
import { boardIdSchema, parseBetValue } from '@/lib/validators/bets'
import { nowMinutesInTz, todayInTz } from '@/lib/utils/tz'

export type BetActionState = { error: string } | { ok: true } | undefined

export async function placeBet(
  _prev: BetActionState,
  formData: FormData,
): Promise<BetActionState> {
  const user = await requireUser()

  const parsedBoardId = boardIdSchema.safeParse(formData.get('boardId'))
  if (!parsedBoardId.success) {
    return { error: 'Board not found' }
  }

  // Membership check on the client-supplied ID, and the board's OWN betType
  // decides how the value is parsed — the client never picks the type.
  const row = await getBoardForUser(parsedBoardId.data, user.id)
  if (!row || !row.membership) {
    return { error: 'Board not found' }
  }
  const { board } = row

  // Lock is derived in the BOARD's timezone (CLAUDE.md gotcha) — today's
  // round only; the date rolls over at board-tz midnight.
  if (nowMinutesInTz(board.timezone) >= board.lockTimeMinutes) {
    return { error: 'Bets are locked for today' }
  }

  const parsedValue = parseBetValue(board.betType, formData.get('betValue'))
  if ('error' in parsedValue) {
    return { error: parsedValue.error }
  }

  const roundDate = todayInTz(board.timezone)

  // Lazy round creation: first bet of the day creates the round.
  const round = await ensureRound(board.id, roundDate)
  if (!round) {
    return { error: 'Could not open today’s round' }
  }
  // Deciding lands in chunk 4, but the owner will be able to decide early —
  // a decided round takes no more bets, ever.
  if (round.outcomeValue !== null) {
    return { error: 'This round is already decided' }
  }

  // One bet per member per round — placing again just updates it (until lock).
  await db
    .insert(bets)
    .values({ roundId: round.id, userId: user.id, betValue: parsedValue.value })
    .onConflictDoUpdate({
      target: [bets.roundId, bets.userId],
      set: { betValue: parsedValue.value, updatedAt: new Date() },
    })

  revalidatePath(`/board/${board.id}`)
  return { ok: true }
}
