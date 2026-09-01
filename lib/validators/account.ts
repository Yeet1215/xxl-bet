import { z } from 'zod'

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name is required')
    .max(40, 'Display name must be at most 40 characters'),
  // Optional: empty clears the email (documented in the UI — no email means
  // no password reset).
  email: z
    .string()
    .trim()
    .max(254)
    .transform((v) => (v.length === 0 ? null : v))
    .refine((v) => v === null || z.string().email().safeParse(v).success, {
      message: 'Enter a valid email address',
    }),
  // Checkbox: present ('on') = true, absent = false.
  notifyOnDecide: z.preprocess((v) => v === 'on', z.boolean()),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password').max(100),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(100, 'New password must be at most 100 characters'),
})
