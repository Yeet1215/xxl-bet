// Pure derivation of profile stats from a user's scored bets — no DB, no
// dates-now, no I/O (unit-tested in stats.test.ts, same policy as scoring.ts).
// Input rows MUST be ordered by roundDate ascending (the query guarantees it);
// streaks are over rounds the user actually played — a skipped day doesn't
// break a streak, losing a played round does.

import type { BetType } from './validators/boards'

export type ScoredBetRow = {
  boardId: string
  boardName: string
  betType: BetType
  unitLabel: string | null
  roundDate: string
  betValue: number
  outcomeValue: number
  score: number
  diffMinutes: number
  isClosest: boolean
  isExact: boolean
}

export type BoardStats = {
  boardId: string
  boardName: string
  betType: BetType
  unitLabel: string | null
  points: number
  played: number
  wins: number
  exacts: number
  /** Mean absolute miss — null for yesno boards (meaningless there). */
  avgDiff: number | null
  /** Wins / played, 0..1 — the yesno headline stat, shown for all types. */
  hitRate: number
  currentStreak: number
  bestStreak: number
}

export function deriveBoardStats(rows: ReadonlyArray<ScoredBetRow>): BoardStats[] {
  const byBoard = new Map<string, ScoredBetRow[]>()
  for (const row of rows) {
    const list = byBoard.get(row.boardId)
    if (list) list.push(row)
    else byBoard.set(row.boardId, [row])
  }

  const stats: BoardStats[] = []
  for (const boardRows of byBoard.values()) {
    const first = boardRows[0]
    let points = 0
    let wins = 0
    let exacts = 0
    let diffSum = 0
    let streak = 0
    let bestStreak = 0
    for (const row of boardRows) {
      points += row.score
      if (row.isClosest) wins++
      if (row.isExact) exacts++
      diffSum += row.diffMinutes
      streak = row.isClosest ? streak + 1 : 0
      if (streak > bestStreak) bestStreak = streak
    }
    const played = boardRows.length
    stats.push({
      boardId: first.boardId,
      boardName: first.boardName,
      betType: first.betType,
      unitLabel: first.unitLabel,
      points,
      played,
      wins,
      exacts,
      avgDiff: first.betType === 'yesno' ? null : Math.round((diffSum / played) * 10) / 10,
      hitRate: wins / played,
      currentStreak: streak,
      bestStreak,
    })
  }

  // Most points first — the profile's own mini-leaderboard.
  return stats.sort((a, b) => b.points - a.points || a.boardName.localeCompare(b.boardName))
}
