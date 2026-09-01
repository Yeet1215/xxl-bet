import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { randomBytes, createHash } from 'crypto'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { sessions, users, type User } from '@/lib/db/schema'

// Ported from fitapp (proven): opaque random token in an httpOnly cookie; the
// DB row id is sha256(token) so a DB leak never exposes usable tokens. 30-day
// rolling expiry, refreshed when under 15 days remain.
const COOKIE_NAME = 'xxlbet_session'
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000
const SESSION_ROLL_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

export async function createSessionForUser(userId: string): Promise<void> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  await db.insert(sessions).values({ id: hashSessionToken(token), userId, expiresAt })
  await setSessionCookie(token, expiresAt)
}

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, hashSessionToken(token)))
  }
  store.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

type SessionValidationResult = { user: User; expiresAt: Date; rolled: boolean } | null

async function validateSession(token: string): Promise<SessionValidationResult> {
  const id = hashSessionToken(token)

  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .limit(1)

  const row = rows[0]
  if (!row) return null

  const now = Date.now()
  if (row.session.expiresAt.getTime() < now) {
    await db.delete(sessions).where(eq(sessions.id, id))
    return null
  }

  let expiresAt = row.session.expiresAt
  let rolled = false
  if (expiresAt.getTime() - now < SESSION_ROLL_THRESHOLD_MS) {
    expiresAt = new Date(now + SESSION_DURATION_MS)
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id))
    rolled = true
  }

  return { user: row.user, expiresAt, rolled }
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null

  const result = await validateSession(token)
  if (!result) return null

  // Only refresh the cookie when the session actually rolled. cookies() is
  // only writable in Server Actions / Route Handlers — page renders silently
  // skip and catch up on the next action (fitapp pattern).
  if (result.rolled) {
    try {
      await setSessionCookie(token, result.expiresAt)
    } catch {
      // no-op: cookie not writable in this context
    }
  }

  return result.user
})

/** Kill every session of a user — used after a password reset. */
export async function deleteSessionsForUser(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId))
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  return user
}
