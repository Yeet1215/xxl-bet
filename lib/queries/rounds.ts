import 'server-only'
import { and, asc, desc, eq, isNull, lt } from 'drizzle-orm'

import { db } from '@/lib/db'
import { bets, decideRequests, rounds, users } from '@/lib/db/schema'

/**
 * Get-or-create a board's round for a date (rounds are lazy — created by the
 * first bet, decide, or decide request). Concurrent-safe via the unique
 * (boardId, roundDate) index.
 */
export async function ensureRound(boardId: string, roundDate: string) {
  await db.insert(rounds).values({ boardId, roundDate }).onConflictDoNothing()
  const [round] = await db
    .select()
    .from(rounds)
    .where(and(eq(rounds.boardId, boardId), eq(rounds.roundDate, roundDate)))
    .limit(1)
  return round ?? null
}

/**
 * A board's round for one date (usually board-tz "today") + its bets with
 * bettor display info and resolve artifacts. Round null = nobody has bet yet.
 */
export async function getRoundWithBets(boardId: string, roundDate: string) {
  const [round] = await db
    .select()
    .from(rounds)
    .where(and(eq(rounds.boardId, boardId), eq(rounds.roundDate, roundDate)))
    .limit(1)
  if (!round) return { round: null, bets: [] as RoundBet[] }

  const betRows = await db
    .select({
      userId: bets.userId,
      displayName: users.displayName,
      username: users.username,
      betValue: bets.betValue,
      updatedAt: bets.updatedAt,
      score: bets.score,
      diffMinutes: bets.diffMinutes,
      isClosest: bets.isClosest,
      isExact: bets.isExact,
    })
    .from(bets)
    .innerJoin(users, eq(bets.userId, users.id))
    .where(eq(bets.roundId, round.id))
    .orderBy(asc(bets.updatedAt))

  return { round, bets: betRows }
}

export type RoundBet = {
  userId: string
  displayName: string
  username: string
  betValue: number
  updatedAt: Date
  score: number | null
  diffMinutes: number | null
  isClosest: boolean | null
  isExact: boolean | null
}

/** Pending decide requests for a round, oldest first, with requester info. */
export async function getPendingDecideRequests(roundId: string) {
  return db
    .select({
      id: decideRequests.id,
      requesterId: decideRequests.requesterId,
      displayName: users.displayName,
      proposedOutcomeValue: decideRequests.proposedOutcomeValue,
      createdAt: decideRequests.createdAt,
    })
    .from(decideRequests)
    .innerJoin(users, eq(decideRequests.requesterId, users.id))
    .where(and(eq(decideRequests.roundId, roundId), eq(decideRequests.status, 'pending')))
    .orderBy(asc(decideRequests.createdAt))
}

/** The viewer's own pending proposal for a round, if any. */
export async function getMyPendingDecideRequest(roundId: string, userId: string) {
  const [request] = await db
    .select({ proposedOutcomeValue: decideRequests.proposedOutcomeValue })
    .from(decideRequests)
    .where(
      and(
        eq(decideRequests.roundId, roundId),
        eq(decideRequests.requesterId, userId),
        eq(decideRequests.status, 'pending'),
      ),
    )
    .limit(1)
  return request ?? null
}

/**
 * Past rounds still waiting for an outcome (owner's "don't strand yesterday"
 * list). Capped — older forgotten rounds can still be decided once these are.
 */
export async function getUndecidedPastRounds(boardId: string, todayDate: string, limit = 14) {
  return db
    .select({ id: rounds.id, roundDate: rounds.roundDate })
    .from(rounds)
    .where(
      and(
        eq(rounds.boardId, boardId),
        lt(rounds.roundDate, todayDate),
        isNull(rounds.outcomeValue),
      ),
    )
    .orderBy(desc(rounds.roundDate))
    .limit(limit)
}
