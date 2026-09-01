import type { BetType } from '@/lib/validators/boards'

// Display metadata per bet type — used by the create form, board stamps, and
// (chunk 3+) the bet inputs. Mechanics live in BUILD-BRIEF.md → Scoring.
export const BET_TYPE_META: Record<
  BetType,
  { label: string; hint: string }
> = {
  time: { label: 'Time', hint: 'Bet on a time of day — e.g. what time he arrives.' },
  number: { label: 'Number', hint: 'Bet on a number — e.g. how many visits today.' },
  yesno: { label: 'Yes / No', hint: 'Bet on whether it happens at all.' },
}
