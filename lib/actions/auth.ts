'use server'

import { createElement } from 'react'
import { randomBytes, createHash } from 'crypto'
import { redirect } from 'next/navigation'
import { and, eq, gt, isNull, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { passwordResetTokens, users } from '@/lib/db/schema'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import {
  createSessionForUser,
  deleteSessionsForUser,
  destroyCurrentSession,
} from '@/lib/auth/session'
import {
  loginSchema,
  registerSchema,
  requestResetSchema,
  resetPasswordSchema,
} from '@/lib/validators/auth'
import { sendEmail } from '@/lib/email/client'
import { ResetPasswordEmail } from '@/lib/email/templates/reset-password'

export type AuthActionState = { error: string } | undefined
export type RequestResetState = { error: string } | { success: true } | undefined

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour, one use

// Timing equalizer (security review m5): unknown usernames still burn one
// bcrypt compare so response time doesn't reveal whether an account exists.
const DUMMY_HASH = '$2b$12$UgHhWj0swpwyxnZ.spV3i.VJJTO1rdZZjyqrSKfsTUmwYu7qX5Xgq'

// No rate limiting in v1 (office app, invite-only in practice) — logged in the
// tech-debt watchlist; must land before this ever faces strangers. The reset
// token itself is 256-bit random, so guessing is infeasible either way.

export async function registerUser(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    username: formData.get('username'),
    displayName: formData.get('displayName'),
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }
  const { username, displayName, email, password } = parsed.data

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(
      sql`lower(${users.username}) = lower(${username}) or lower(${users.email}) = lower(${email})`,
    )
    .limit(1)
  if (existing.length > 0) {
    return { error: 'Username or email already taken' }
  }

  const passwordHash = await hashPassword(password)
  let created: { id: string } | undefined
  try {
    ;[created] = await db
      .insert(users)
      .values({ username, displayName, email, passwordHash })
      .returning({ id: users.id })
  } catch (err) {
    // Concurrent duplicate registration: the unique indexes win the race the
    // check above lost — return the friendly error, not a 500.
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('users_username_lower_idx') || message.includes('users_email_lower_idx')) {
      return { error: 'Username or email already taken' }
    }
    throw err
  }
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

  // Same error for unknown user and wrong password — no username enumeration,
  // and the same bcrypt cost either way (no timing oracle).
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !valid) {
    return { error: 'Invalid username or password' }
  }

  await createSessionForUser(user.id)
  redirect('/')
}

export async function logoutUser(): Promise<void> {
  await destroyCurrentSession()
  redirect('/login')
}

// Enumeration-safe: always reports success whether or not the account exists
// or has an email — the email itself is the only confirmation channel.
export async function requestPasswordReset(
  _prev: RequestResetState,
  formData: FormData,
): Promise<RequestResetState> {
  const parsed = requestResetSchema.safeParse({
    usernameOrEmail: formData.get('usernameOrEmail'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }
  const { usernameOrEmail } = parsed.data

  const [user] = await db
    .select({ id: users.id, username: users.username, email: users.email })
    .from(users)
    .where(
      sql`lower(${users.username}) = lower(${usernameOrEmail}) or lower(${users.email}) = lower(${usernameOrEmail})`,
    )
    .limit(1)

  if (user?.email) {
    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)

    await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt })

    const base = process.env.APP_URL ?? 'http://localhost:3000'
    const { error } = await sendEmail(
      user.email,
      'Reset your XXL Bet password',
      createElement(ResetPasswordEmail, {
        username: user.username,
        resetLink: `${base}/reset-password/${token}`,
      }),
    )
    if (error) console.error('[requestPasswordReset] send failed:', error)
  }

  return { success: true }
}

export async function resetPassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }
  const { token, password } = parsed.data

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const [resetRow] = await db
    .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1)

  if (!resetRow) {
    return { error: 'This reset link is invalid or has expired.' }
  }

  const newHash = await hashPassword(password)
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, resetRow.userId))
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, resetRow.id))
  // Fitapp lesson: a reset must kill EVERY existing session.
  await deleteSessionsForUser(resetRow.userId)

  redirect('/login?reset=1')
}
