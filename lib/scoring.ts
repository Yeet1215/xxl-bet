// The scoring engine — a PURE function (no DB, no dates, no I/O) so deciding
// and RE-deciding a round is just "recompute everything". Spec lives in
// BUILD-BRIEF.md → Scoring; the unit tests in scoring.test.ts are the
// executable version of that spec. Relative imports only (vitest runs this
// without path-alias config).

import type { BetType } from './validators/boards'

export type ScoringSettings = {
  betType: BetType
  windowSize: number
  maxPoints: number
  exactMultiplier: number
}

export type ScoredBet = {
  userId: string
  score: number
  diff: number
  isClosest: boolean
  isExact: boolean
}

export function scoreRound(
  bets: ReadonlyArray<{ userId: string; betValue: number }>,
  outcome: number,
  settings: ScoringSettings,
): ScoredBet[] {
  if (bets.length === 0) return []

  const { betType, windowSize, maxPoints, exactMultiplier } = settings

  // yesno: right-or-wrong. windowSize/exactMultiplier deliberately unused —
  // a correct guess IS the exact hit, and there is no "close".
  if (betType === 'yesno') {
    return bets.map((bet) => {
      const correct = bet.betValue === outcome
      return {
        userId: bet.userId,
        score: correct ? maxPoints : 0,
        diff: correct ? 0 : 1,
        isClosest: correct,
        isExact: correct,
      }
    })
  }

  // time/number: linear decay inside the window; the closest bet(s) always
  // get full maxPoints (even outside the window); exact beats everything.
  const diffs = bets.map((bet) => Math.abs(bet.betValue - outcome))
  const minDiff = Math.min(...diffs)

  return bets.map((bet, i) => {
    const diff = diffs[i]
    const isExact = diff === 0
    const isClosest = diff === minDiff
    const base = diff > windowSize ? 0 : Math.round(maxPoints * (1 - diff / windowSize))
    const score = isExact ? maxPoints * exactMultiplier : isClosest ? maxPoints : base
    return { userId: bet.userId, score, diff, isClosest, isExact }
  })
}
