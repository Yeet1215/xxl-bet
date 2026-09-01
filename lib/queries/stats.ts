import 'server-only'
import { and, asc, eq, isNotNull, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { bets, boards, rounds } from '@/lib/db/schema'
import { getBoardMembers } from '@/lib/queries/boards'
import type { ScoredBetRow } from '@/lib/stats'

export type LeaderboardRow = {
  userId: string
  displayName: string
  username: string
  role: 'owner' | 'member'
  points: number
  played: number
  wins: number
  exacts: number
}

/**
 * All board members ranked by total score over decided rounds. Two simple
 * queries merged in JS (members + per-user aggregates) — zero-pointers stay
 * on the list at the bottom; the leaderboard IS the members list.
 */
export async function getBoardLeaderboard(boardId: string): Promise<LeaderboardRow[]> {
  const members = await getBoardMembers(boardId)

  const aggregates = await db
    .select({
      userId: bets.userId,
      points: sql<number>`coalesce(sum(${bets.score}), 0)::int`,
      played: sql<number>`count(*)::int`,
      wins: sql<number>`count(*) filter (where ${bets.isClosest})::int`,
      exacts: sql<number>`count(*) filter (where ${bets.isExact})::int`,
    })
    .from(bets)
    .innerJoin(rounds, eq(bets.roundId, rounds.id))
    .where(and(eq(rounds.boardId, boardId), isNotNull(rounds.outcomeValue), isNotNull(bets.score)))
    .groupBy(bets.userId)
  const byUser = new Map(aggregates.map((a) => [a.userId, a]))

  return members
    .map((member) => {
      const agg = byUser.get(member.userId)
      return {
        userId: member.userId,
        displayName: member.displayName,
        username: member.username,
        role: member.role,
        points: agg?.points ?? 0,
        played: agg?.played ?? 0,
        wins: agg?.wins ?? 0,
        exacts: agg?.exacts ?? 0,
      }
    })
    .sort(
      (a, b) =>
        b.points - a.points || b.wins - a.wins || a.displayName.localeCompare(b.displayName),
    )
}

/**
 * Every scored bet of one user across boards, roundDate ascending — the single
 * dataset behind the profile (per-board stats via lib/stats.ts + history).
 */
export async function getScoredBetsForUser(userId: string): Promise<ScoredBetRow[]> {
  const rows = await db
    .select({
      boardId: boards.id,
      boardName: boards.name,
      betType: boards.betType,
      unitLabel: boards.unitLabel,
      roundDate: rounds.roundDate,
      betValue: bets.betValue,
      outcomeValue: rounds.outcomeValue,
      score: bets.score,
      diffMinutes: bets.diffMinutes,
      isClosest: bets.isClosest,
      isExact: bets.isExact,
    })
    .from(bets)
    .innerJoin(rounds, eq(bets.roundId, rounds.id))
    .innerJoin(boards, eq(rounds.boardId, boards.id))
    .where(and(eq(bets.userId, userId), isNotNull(rounds.outcomeValue), isNotNull(bets.score)))
    .orderBy(asc(rounds.roundDate))

  // The isNotNull filters guarantee the resolve artifacts are present; narrow
  // the nullable column types once, here, instead of `!` at every use site.
  return rows as ScoredBetRow[]
}
