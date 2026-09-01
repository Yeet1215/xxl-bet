import { z } from 'zod'

import { parseTimeToMinutes } from '@/lib/utils/tz'

export const BET_TYPES = ['time', 'number', 'yesno'] as const
export type BetType = (typeof BET_TYPES)[number]

// 'HH:MM' string (native <input type="time">) → minutes since midnight.
const lockTimeSchema = z
  .string()
  .transform((v, ctx) => {
    const minutes = parseTimeToMinutes(v)
    if (minutes === null) {
      ctx.addIssue({ code: 'custom', message: 'Lock time must be HH:MM' })
      return z.NEVER
    }
    return minutes
  })

const scoringFields = {
  lockTime: lockTimeSchema,
  windowSize: z.coerce
    .number()
    .int('Window must be a whole number')
    .min(1, 'Window must be at least 1')
    .max(1_000_000, 'Window is too large'),
  maxPoints: z.coerce
    .number()
    .int('Points must be a whole number')
    .min(1, 'Max points must be at least 1')
    .max(1000, 'Max points must be at most 1000'),
  exactMultiplier: z.coerce
    .number()
    .int('Multiplier must be a whole number')
    .min(1, 'Multiplier must be at least 1')
    .max(10, 'Multiplier must be at most 10'),
}

const boardBaseFields = {
  name: z.string().trim().min(1, 'Name is required').max(60, 'Name must be at most 60 characters'),
  subject: z
    .string()
    .trim()
    .min(1, 'Subject is required')
    .max(100, 'Subject must be at most 100 characters'),
  unitLabel: z
    .string()
    .trim()
    .max(20, 'Unit must be at most 20 characters')
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  ...scoringFields,
}

export const createBoardSchema = z.object({
  ...boardBaseFields,
  betType: z.enum(BET_TYPES),
})

// betType is deliberately absent — fixed at creation (historical bets would
// become meaningless).
export const updateBoardSettingsSchema = z.object({
  boardId: z.string().uuid(),
  ...boardBaseFields,
})

export const joinBoardSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .min(4, 'That code looks too short')
    .max(12, 'That code looks too long')
    .transform((v) => v.toUpperCase()),
})
