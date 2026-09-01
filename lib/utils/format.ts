// Display formatting for bet values and round dates. Client-safe (no server
// imports) — the STORED value is always a plain integer (CLAUDE.md standard);
// meaning is applied here, at the UI edge, and nowhere else.

import { formatMinutes } from '@/lib/utils/tz'
import type { BetType } from '@/lib/validators/boards'

export function formatBetValue(
  value: number,
  betType: BetType,
  unitLabel: string | null,
): string {
  if (betType === 'time') return formatMinutes(value)
  if (betType === 'yesno') return value === 1 ? 'Yes' : 'No'
  return unitLabel ? `${value} ${unitLabel}` : String(value)
}

/** 'YYYY-MM-DD' (rounds.roundDate string mode) → 'Mon 1 Sep'. */
export function formatRoundDate(roundDate: string): string {
  // Parse as UTC midnight and format in UTC — the string IS the calendar date,
  // no timezone math belongs here.
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${roundDate}T00:00:00Z`))
}
