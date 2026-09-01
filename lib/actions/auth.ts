'use server'

import { redirect } from 'next/navigation'
import { sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { createSessionForUser, destroyCurrentSession } from '@/lib/auth/session'
import { registerSchema, loginSchema } from '@/lib/validators/auth'

export type AuthActionState = { error: string } | undefined

// No rate limiting in v1 (office app, invite-only in practice) — logged in the
// tech-debt watchlist; must land before this ever faces strangers.

export async function registerUser(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    username: formData.get('username'),
    displayName: formData.get('displayName'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }
  const { username, displayName, password } = parsed.data

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.username}) = lower(${username})`)
    .limit(1)
  if (existing.length > 0) {
    return { error: 'Username already taken' }
  }

  const passwordHash = await hashPassword(password)
  const [created] = await db
    .insert(users)
    .values({ username, displayName, passwordHash })
    .returning({ id: users.id })
  if (!created) {
    return { error: 'Could not create account' }
  }

  await createSessionForUser(created.id)
  redirect('/')
}

export async function loginUser(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }
  const { username, password } = parsed.data

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(sql`lower(${users.username}) = lower(${username})`)
    .limit(1)

  // Same error for unknown user and wrong password — no username enumeration.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: 'Invalid username or password' }
  }

  await createSessionForUser(user.id)
  redirect('/')
}

export async function logoutUser(): Promise<void> {
  await destroyCurrentSession()
  redirect('/login')
}
