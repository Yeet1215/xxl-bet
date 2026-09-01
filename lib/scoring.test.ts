import { describe, expect, it } from 'vitest'

import { scoreRound, type ScoringSettings } from './scoring'

// Executable spec for BUILD-BRIEF.md → Scoring. Defaults mirror the doc.
const TIME: ScoringSettings = {
  betType: 'time',
  windowSize: 60,
  maxPoints: 100,
  exactMultiplier: 2,
}

const bet = (userId: string, betValue: number) => ({ userId, betValue })
const byUser = (result: ReturnType<typeof scoreRound>, userId: string) => {
  const row = result.find((r) => r.userId === userId)
  if (!row) throw new Error(`no result for ${userId}`)
  return row
}

describe('scoreRound — time/number closeness', () => {
  // Outcome 10:15 = 615. The BUILD-BRIEF example table, verbatim.
  const outcome = 615

  it('scores the documented example round', () => {
    const result = scoreRound(
      [
        bet('exact', 615), // exact → 200
        bet('closest-after-exact', 622), // 7 off → but exact exists; base 88... see below
        bet('mid', 645), // 30 off → 50
        bet('edge', 674), // 59 off → 2
        bet('outside', 690), // 75 off → 0
      ],
      outcome,
      TIME,
    )
    expect(byUser(result, 'exact')).toMatchObject({ score: 200, isExact: true, isClosest: true })
    // 7 min off, NOT closest (exact bet is closer): plain base = round(100 * (1 - 7/60)) = 88.
    expect(byUser(result, 'closest-after-exact')).toMatchObject({
      score: 88,
      isClosest: false,
      isExact: false,
    })
    expect(byUser(result, 'mid').score).toBe(50)
    expect(byUser(result, 'edge').score).toBe(2)
    expect(byUser(result, 'outside')).toMatchObject({ score: 0, isClosest: false })
  })

  it('gives the closest bet full maxPoints even when its base would be lower', () => {
    const result = scoreRound([bet('a', 622), bet('b', 645)], outcome, TIME)
    // 7 off is closest → full 100, not base 88.
    expect(byUser(result, 'a')).toMatchObject({ score: 100, isClosest: true, isExact: false })
    expect(byUser(result, 'b')).toMatchObject({ score: 50, isClosest: false })
  })

  it('gives the closest bet full maxPoints even OUTSIDE the window', () => {
    const result = scoreRound([bet('a', 700), bet('b', 720)], outcome, TIME)
    // 85 off — outside the 60 window (base 0) but still the closest → 100.
    expect(byUser(result, 'a')).toMatchObject({ score: 100, isClosest: true })
    expect(byUser(result, 'b')).toMatchObject({ score: 0, isClosest: false })
  })

  it('ties on closest all get maxPoints (either side of the outcome)', () => {
    const result = scoreRound([bet('under', 605), bet('over', 625), bet('far', 660)], outcome, TIME)
    expect(byUser(result, 'under')).toMatchObject({ score: 100, isClosest: true })
    expect(byUser(result, 'over')).toMatchObject({ score: 100, isClosest: true })
    expect(byUser(result, 'far').isClosest).toBe(false)
  })

  it('multiple exact hits all get the multiplied score', () => {
    const result = scoreRound([bet('a', 615), bet('b', 615)], outcome, TIME)
    expect(byUser(result, 'a').score).toBe(200)
    expect(byUser(result, 'b').score).toBe(200)
  })

  it('a single bet is closest by definition', () => {
    const result = scoreRound([bet('solo', 700)], outcome, TIME)
    expect(byUser(result, 'solo')).toMatchObject({ score: 100, isClosest: true })
  })

  it('respects custom settings (number board, window 10, max 50, mult 3)', () => {
    const settings: ScoringSettings = {
      betType: 'number',
      windowSize: 10,
      maxPoints: 50,
      exactMultiplier: 3,
    }
    const result = scoreRound([bet('exact', 7), bet('near', 9), bet('out', 30)], 7, settings)
    expect(byUser(result, 'exact').score).toBe(150)
    expect(byUser(result, 'near').score).toBe(40) // round(50 * (1 - 2/10))
    expect(byUser(result, 'out').score).toBe(0)
  })

  it('returns an empty array for an empty round', () => {
    expect(scoreRound([], outcome, TIME)).toEqual([])
  })
})

describe('scoreRound — yesno', () => {
  const YESNO: ScoringSettings = {
    betType: 'yesno',
    windowSize: 60, // deliberately present — must be ignored
    maxPoints: 100,
    exactMultiplier: 2, // must be ignored — no double points on a coin flip
  }

  it('correct gets maxPoints (not multiplied), wrong gets 0', () => {
    const result = scoreRound([bet('right', 1), bet('wrong', 0)], 1, YESNO)
    // isExact stays false — a correct coin flip is a win, not a celebrated
    // "exact hit" (no confetti/Clairvoyant/double points for yesno).
    expect(byUser(result, 'right')).toMatchObject({ score: 100, isExact: false, isClosest: true })
    expect(byUser(result, 'wrong')).toMatchObject({ score: 0, isExact: false, isClosest: false })
  })
})
