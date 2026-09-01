import { describe, expect, it } from 'vitest'

import { deriveBoardStats, type ScoredBetRow } from './stats'

const row = (over: Partial<ScoredBetRow> & { roundDate: string }): ScoredBetRow => ({
  boardId: 'b1',
  boardName: 'Arrival',
  betType: 'time',
  unitLabel: null,
  betValue: 615,
  outcomeValue: 615,
  score: 0,
  diffMinutes: 0,
  isClosest: false,
  isExact: false,
  ...over,
})

describe('deriveBoardStats', () => {
  it('aggregates points, played, wins, exacts and avg miss per board', () => {
    const [stats] = deriveBoardStats([
      row({ roundDate: '2026-09-01', score: 200, diffMinutes: 0, isClosest: true, isExact: true }),
      row({ roundDate: '2026-09-02', score: 100, diffMinutes: 8, isClosest: true }),
      row({ roundDate: '2026-09-03', score: 50, diffMinutes: 30 }),
    ])
    expect(stats).toMatchObject({
      points: 350,
      played: 3,
      wins: 2,
      exacts: 1,
      avgDiff: 12.7, // (0 + 8 + 30) / 3 rounded to 1 decimal
    })
    expect(stats.hitRate).toBeCloseTo(2 / 3)
  })

  it('tracks win streaks over played rounds; a loss resets, the best survives', () => {
    const [stats] = deriveBoardStats([
      row({ roundDate: '2026-09-01', isClosest: true }),
      row({ roundDate: '2026-09-02', isClosest: true }),
      row({ roundDate: '2026-09-03', isClosest: true }),
      row({ roundDate: '2026-09-04' }), // loss — resets
      row({ roundDate: '2026-09-07', isClosest: true }), // skipped weekend irrelevant
      row({ roundDate: '2026-09-08', isClosest: true }),
    ])
    expect(stats.bestStreak).toBe(3)
    expect(stats.currentStreak).toBe(2)
  })

  it('splits stats per board and sorts by points', () => {
    const stats = deriveBoardStats([
      row({ roundDate: '2026-09-01', score: 10 }),
      row({ roundDate: '2026-09-01', boardId: 'b2', boardName: 'Toilet', score: 100, isClosest: true }),
    ])
    expect(stats.map((s) => s.boardName)).toEqual(['Toilet', 'Arrival'])
  })

  it('yesno boards get hitRate but a null avgDiff', () => {
    const [stats] = deriveBoardStats([
      row({ roundDate: '2026-09-01', betType: 'yesno', isClosest: true, isExact: true, diffMinutes: 0 }),
      row({ roundDate: '2026-09-02', betType: 'yesno', diffMinutes: 1 }),
    ])
    expect(stats.avgDiff).toBeNull()
    expect(stats.hitRate).toBe(0.5)
  })

  it('returns an empty array for a user with no scored bets', () => {
    expect(deriveBoardStats([])).toEqual([])
  })
})
