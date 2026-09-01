import { z } from 'zod'

export const decideRoundSchema = z.object({
  boardId: z.string().uuid(),
  roundDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
    // The regex accepts impossible dates like 2026-02-31 — round-trip through
    // Date to reject them before they hit the DB as a 500.
    .refine((v) => {
      const date = new Date(`${v}T00:00:00Z`)
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === v
    }, 'Invalid date'),
})

export const requestIdSchema = z.string().uuid()
