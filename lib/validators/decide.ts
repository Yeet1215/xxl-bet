import { z } from 'zod'

export const decideRoundSchema = z.object({
  boardId: z.string().uuid(),
  roundDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
})

export const requestIdSchema = z.string().uuid()
