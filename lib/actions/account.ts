'use server'

import { revalidatePath } from 'next/cache'
import { eq, sql, and, ne } from 'drizzle-orm'

import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth/session'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import {
  createSessionForUser,
  deleteSessionsForUser,
} from '@/lib/auth/session'
import { changePasswordSchema, updateProfileSchema } from '@/lib/validators/account'

export type AccountActionState = { error: string } | { ok: true } | undefined

export async function updateProfile(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser()

  const parsed = updateProfileSchema.safeParse({
    displayName: formData.get('displayName'),
    email: formData.get('email') ?? '',
    notifyOnDecide: formData.get('notifyOnDecide'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }
  const { displayName, email, notifyOnDecide } = parsed.data

  if (email !== null) {
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(sql`lower(${users.email}) = lower(${email})`, ne(users.id, user.id)))
      .limit(1)
    if (taken) return { error: 'That email is already in use' }
  }

  try {
    await db
      .update(users)
      .set({ displayName, email, notifyOnDecide })
      .where(eq(users.id, user.id))
  } catch (err) {
    // Concurrent duplicate email: the lower-unique index wins the race.
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('users_email_lower_idx')) {
      return { error: 'That email is already in use' }
    }
    throw err
  }

  // Display name shows in the header on every page.
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function changePassword(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser()

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }
  const { currentPassword, newPassword } = parsed.data

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return { error: 'Current password is incorrect' }
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword) })
    .where(eq(users.id, user.id))

  // Log out everywhere else, keep THIS browser signed in on a fresh session.
  await deleteSessionsForUser(user.id)
  await createSessionForUser(user.id)

  return { ok: true }
}
