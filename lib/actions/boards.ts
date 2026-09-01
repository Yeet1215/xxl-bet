'use server'

import { randomBytes } from 'crypto'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { boards, boardMembers } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth/session'
import {
  createBoardSchema,
  joinBoardSchema,
  updateBoardSettingsSchema,
} from '@/lib/validators/boards'

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
