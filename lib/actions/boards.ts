'use server'

import { randomBytes } from 'crypto'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/lib/db'
import { boards, boardMembers } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth/session'
import {
  createBoardSchema,
  joinBoardSchema,
  updateBoardSettingsSchema,
} from '@/lib/validators/boards'
import { nowMinutesInTz } from '@/lib/utils/tz'

export type BoardActionState = { error: string } | { ok: true } | undefined

// Unambiguous alphabet (no I/O/0/1 lookalikes) — codes get read out loud
// across the office.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 8

function generateInviteCode(): string {
  const bytes = randomBytes(CODE_LENGTH)
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  }
  return code
}

export async function createBoard(
  _prev: BoardActionState,
  formData: FormData,
): Promise<BoardActionState> {
  const user = await requireUser()

  const parsed = createBoardSchema.safeParse({
    name: formData.get('name'),
    subject: formData.get('subject'),
    betType: formData.get('betType'),
    unitLabel: formData.get('unitLabel') ?? undefined,
    lockTime: formData.get('lockTime'),
    windowSize: formData.get('windowSize'),
    maxPoints: formData.get('maxPoints'),
    exactMultiplier: formData.get('exactMultiplier'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }
  const { name, subject, betType, unitLabel, lockTime, windowSize, maxPoints, exactMultiplier } =
    parsed.data

  // Invite codes are unique — regenerate on the (astronomically rare) collision.
  let boardId: string | null = null
  for (let attempt = 0; attempt < 3 && !boardId; attempt++) {
    try {
      const [created] = await db
        .insert(boards)
        .values({
          ownerId: user.id,
          name,
          subject,
          betType,
          // Unit label only means something on number boards.
          unitLabel: betType === 'number' ? unitLabel : null,
          inviteCode: generateInviteCode(),
          lockTimeMinutes: lockTime,
          windowSize,
          maxPoints,
          exactMultiplier,
        })
        .returning({ id: boards.id })
      boardId = created?.id ?? null
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!message.includes('boards_invite_code_unique')) throw err
    }
  }
  if (!boardId) {
    return { error: 'Could not create board' }
  }

  await db.insert(boardMembers).values({ boardId, userId: user.id, role: 'owner' })

  redirect(`/board/${boardId}`)
}

export async function joinBoard(
  _prev: BoardActionState,
  formData: FormData,
): Promise<BoardActionState> {
  const user = await requireUser()

  const parsed = joinBoardSchema.safeParse({ inviteCode: formData.get('inviteCode') })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid code' }
  }

  const [board] = await db
    .select({ id: boards.id })
    .from(boards)
    .where(eq(boards.inviteCode, parsed.data.inviteCode))
    .limit(1)
  if (!board) {
    return { error: 'No board found with that code' }
  }

  // Already a member → just go there (idempotent join).
  await db
    .insert(boardMembers)
    .values({ boardId: board.id, userId: user.id, role: 'member' })
    .onConflictDoNothing()

  redirect(`/board/${board.id}`)
}

export async function updateBoardSettings(
  _prev: BoardActionState,
  formData: FormData,
): Promise<BoardActionState> {
  const user = await requireUser()

  const parsed = updateBoardSettingsSchema.safeParse({
    boardId: formData.get('boardId'),
    name: formData.get('name'),
    subject: formData.get('subject'),
    unitLabel: formData.get('unitLabel') ?? undefined,
    lockTime: formData.get('lockTime'),
    windowSize: formData.get('windowSize'),
    maxPoints: formData.get('maxPoints'),
    exactMultiplier: formData.get('exactMultiplier'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }
  const { boardId, name, subject, unitLabel, lockTime, windowSize, maxPoints, exactMultiplier } =
    parsed.data

  // Anti-peek guard (security review M2): once today's bets are revealed
  // (now >= current lock), moving the lock LATER would silently reopen the
  // round with everyone's bets visible. Refuse; the change is fine tomorrow.
  const [current] = await db
    .select({
      ownerId: boards.ownerId,
      lockTimeMinutes: boards.lockTimeMinutes,
      timezone: boards.timezone,
    })
    .from(boards)
    .where(eq(boards.id, boardId))
    .limit(1)
  if (!current || current.ownerId !== user.id) {
    return { error: 'Board not found' }
  }
  const nowMinutes = nowMinutesInTz(current.timezone)
  if (nowMinutes >= current.lockTimeMinutes && lockTime > nowMinutes) {
    return {
      error:
        'Today’s bets are already revealed — a later lock time would reopen them. Change it after midnight.',
    }
  }

  // Ownership check on the client-supplied ID (CLAUDE.md rule) — the WHERE
  // clause is the guard: no row updated means not the owner (or no board).
  const updated = await db
    .update(boards)
    .set({
      name,
      subject,
      unitLabel,
      lockTimeMinutes: lockTime,
      windowSize,
      maxPoints,
      exactMultiplier,
    })
    .where(and(eq(boards.id, boardId), eq(boards.ownerId, user.id)))
    .returning({ id: boards.id, betType: boards.betType })

  if (updated.length === 0) {
    return { error: 'Board not found' }
  }

  // unitLabel only applies to number boards — clear it elsewhere.
  if (updated[0].betType !== 'number' && unitLabel !== null) {
    await db.update(boards).set({ unitLabel: null }).where(eq(boards.id, boardId))
  }

  revalidatePath(`/board/${boardId}`)
  revalidatePath(`/board/${boardId}/settings`)
  return { ok: true }
}

const uuidSchema = z.string().uuid()

// Member leaves a board. The owner can't leave their own board (transfer or
// delete would be its own feature). Historical bets stay — decided rounds
// still show the name; rejoining via code restores leaderboard presence.
export async function leaveBoard(rawBoardId: unknown): Promise<{ error?: string }> {
  const user = await requireUser()

  const parsedId = uuidSchema.safeParse(rawBoardId)
  if (!parsedId.success) return { error: 'Board not found' }
  const boardId = parsedId.data

  const [board] = await db
    .select({ ownerId: boards.ownerId })
    .from(boards)
    .where(eq(boards.id, boardId))
    .limit(1)
  if (!board) return { error: 'Board not found' }
  if (board.ownerId === user.id) {
    return { error: 'Owners can’t leave their own board' }
  }

  await db
    .delete(boardMembers)
    .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, user.id)))

  revalidatePath('/')
  redirect('/')
}

// Owner removes a member (never themselves — the owner row is the board's
// anchor). Same history semantics as leaving.
export async function kickMember(
  rawBoardId: unknown,
  rawUserId: unknown,
): Promise<{ error?: string }> {
  const user = await requireUser()

  const parsedBoard = uuidSchema.safeParse(rawBoardId)
  const parsedUser = uuidSchema.safeParse(rawUserId)
  if (!parsedBoard.success || !parsedUser.success) return { error: 'Not found' }
  if (parsedUser.data === user.id) return { error: 'You can’t remove yourself' }

  // Ownership check in the WHERE via the boards subcondition.
  const [board] = await db
    .select({ id: boards.id })
    .from(boards)
    .where(and(eq(boards.id, parsedBoard.data), eq(boards.ownerId, user.id)))
    .limit(1)
  if (!board) return { error: 'Board not found' }

  const removed = await db
    .delete(boardMembers)
    .where(
      and(
        eq(boardMembers.boardId, board.id),
        eq(boardMembers.userId, parsedUser.data),
        eq(boardMembers.role, 'member'),
      ),
    )
    .returning({ id: boardMembers.id })
  if (removed.length === 0) return { error: 'Member not found' }

  revalidatePath(`/board/${board.id}`)
  revalidatePath(`/board/${board.id}/settings`)
  return {}
}

// Owner rotates the invite code — the old one dies instantly.
export async function regenerateInviteCode(rawBoardId: unknown): Promise<{ error?: string }> {
  const user = await requireUser()

  const parsedId = uuidSchema.safeParse(rawBoardId)
  if (!parsedId.success) return { error: 'Board not found' }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const updated = await db
        .update(boards)
        .set({ inviteCode: generateInviteCode() })
        .where(and(eq(boards.id, parsedId.data), eq(boards.ownerId, user.id)))
        .returning({ id: boards.id })
      if (updated.length === 0) return { error: 'Board not found' }
      revalidatePath(`/board/${updated[0].id}`)
      revalidatePath(`/board/${updated[0].id}/settings`)
      return {}
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!message.includes('boards_invite_code_unique')) throw err
    }
  }
  return { error: 'Could not generate a new code — try again' }
}

// Owner deletes the board — PERMANENT: cascades rounds, bets, decide
// requests, memberships, hall of fame, everything. The typed board name is
// the confirmation (re-verified server-side; the UI gate alone is not trust).
export async function deleteBoard(
  _prev: BoardActionState,
  formData: FormData,
): Promise<BoardActionState> {
  const user = await requireUser()

  const parsed = z
    .object({
      boardId: z.string().uuid(),
      confirmName: z.string().min(1, 'Type the board name to confirm'),
    })
    .safeParse({
      boardId: formData.get('boardId'),
      confirmName: formData.get('confirmName'),
    })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }
  const { boardId, confirmName } = parsed.data

  const [board] = await db
    .select({ id: boards.id, name: boards.name })
    .from(boards)
    .where(and(eq(boards.id, boardId), eq(boards.ownerId, user.id)))
    .limit(1)
  if (!board) return { error: 'Board not found' }
  if (confirmName.trim() !== board.name) {
    return { error: 'Name doesn’t match — nothing was deleted' }
  }

  await db.delete(boards).where(and(eq(boards.id, boardId), eq(boards.ownerId, user.id)))

  revalidatePath('/')
  redirect('/')
}
