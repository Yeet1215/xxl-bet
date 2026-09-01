import { z } from 'zod'

import { parseTimeToMinutes } from '@/lib/utils/tz'
import type { BetType } from '@/lib/validators/boards'

export const boardIdSchema = z.string().uuid()

// The VALUE schemas are per bet type; placeBet picks one AFTER loading the
// board — the server's betType is the source of truth, never the client's.
const timeValueSchema = z.string().transform((v, ctx) => {
  const minutes = parseTimeToMinutes(v)
  if (minutes === null) {
    ctx.addIssue({ code: 'custom', message: 'Bet must be a time (HH:MM)' })
    return z.NEVER
  }
  return minutes
})

const numberValueSchema = z.coerce
  .number()
  .int('Bet must be a whole number')
  .min(-100_000_000, 'Bet is too small')
  .max(100_000_000, 'Bet is too large')

const yesnoValueSchema = z.enum(['1', '0']).transform((v) => Number(v))

export function parseBetValue(
  betType: BetType,
  raw: FormDataEntryValue | null,
): { value: number } | { error: string } {
  const schema =
    betType === 'time' ? timeValueSchema : betType === 'number' ? numberValueSchema : yesnoValueSchema
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid bet' }
  }
  return { value: parsed.data }
}
