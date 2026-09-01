import 'server-only'
import { and, asc, eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { bets, rounds, users } from '@/lib/db/schema'

/**
 * A board's round for one date (usually board-tz "today") + its bets with
 * bettor display info. Round null = nobody has bet yet (rounds are created
 * lazily by the first bet).
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
}
