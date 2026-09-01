import 'server-only'
import { and, asc, eq, isNotNull, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { bets, boards, rounds, users } from '@/lib/db/schema'
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

/** First day of the month after 'YYYY-MM' (for half-open range filters). */
function nextMonthStart(month: string): string {
  const [year, monthNum] = month.split('-').map(Number)
  return monthNum === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(monthNum + 1).padStart(2, '0')}-01`
}

/**
 * All board members ranked by total score over decided rounds — optionally
 * restricted to one season (`month` = 'YYYY-MM' in board tz). Two simple
 * queries merged in JS (members + per-user aggregates) — zero-pointers stay
 * on the list at the bottom; the leaderboard IS the members list.
 */
export async function getBoardLeaderboard(
  boardId: string,
  month?: string,
): Promise<LeaderboardRow[]> {
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
    .where(
      and(
        eq(rounds.boardId, boardId),
        isNotNull(rounds.outcomeValue),
        isNotNull(bets.score),
        // Half-open month range — index-friendly, DST-proof (dates are
        // board-tz calendar strings, no timestamps involved).
        month ? sql`${rounds.roundDate} >= ${`${month}-01`}` : undefined,
        month ? sql`${rounds.roundDate} < ${nextMonthStart(month)}` : undefined,
      ),
    )
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

export type SeasonWinner = {
  month: string // 'YYYY-MM'
  winners: string[] // displayNames; ties share the crown
  points: number
}

/**
 * Hall of fame: the winner(s) of each CLOSED season (month) on a board,
 * newest first. Per-(month,user) aggregate in SQL, winner-picking in JS —
 * no window functions needed at office scale.
 */
export async function getSeasonWinners(
  boardId: string,
  beforeMonth: string,
  limit = 12,
): Promise<SeasonWinner[]> {
  const monthExpr = sql<string>`to_char(${rounds.roundDate}, 'YYYY-MM')`
  const perUser = await db
    .select({
      month: monthExpr,
      displayName: users.displayName,
      points: sql<number>`coalesce(sum(${bets.score}), 0)::int`,
    })
    .from(bets)
    .innerJoin(rounds, eq(bets.roundId, rounds.id))
    .innerJoin(users, eq(bets.userId, users.id))
    .where(
      and(
        eq(rounds.boardId, boardId),
        isNotNull(rounds.outcomeValue),
        isNotNull(bets.score),
        sql`${rounds.roundDate} < ${`${beforeMonth}-01`}`,
      ),
    )
    .groupBy(monthExpr, users.id, users.displayName)

  const byMonth = new Map<string, { displayName: string; points: number }[]>()
  for (const row of perUser) {
    const list = byMonth.get(row.month)
    if (list) list.push(row)
    else byMonth.set(row.month, [row])
  }

  const seasons: SeasonWinner[] = []
  for (const [month, players] of byMonth) {
    const top = Math.max(...players.map((p) => p.points))
    seasons.push({
      month,
      winners: players.filter((p) => p.points === top).map((p) => p.displayName),
      points: top,
    })
  }

  return seasons.sort((a, b) => b.month.localeCompare(a.month)).slice(0, limit)
}
