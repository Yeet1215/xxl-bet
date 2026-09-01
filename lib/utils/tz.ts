// Timezone + time helpers — the ONLY place "what time is it for this board"
// logic may live (CLAUDE.md gotcha: Vercel runs UTC; never new Date().getHours()
// on the server). All betting times are minutes since midnight (0–1439).

export const DEFAULT_TIMEZONE = 'Europe/Amsterdam'

/** Today's calendar date in the given timezone, as 'YYYY-MM-DD'. */
export function todayInTz(timeZone: string): string {
  // en-CA locale formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Current wall-clock time in the given timezone, as minutes since midnight. */
export function nowMinutesInTz(timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

/** 625 → '10:25'. Display formatting only — storage stays integer. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** '10:25' → 625. Returns null for anything that isn't valid HH:MM. */
export function parseTimeToMinutes(value: string): number | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim())
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}
