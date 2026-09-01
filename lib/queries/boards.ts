import 'server-only'
import { eq, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { boards, boardMembers, users } from '@/lib/db/schema'

/** Boards the user belongs to, newest first, with member counts. */
export async function getBoardsForUser(userId: string) {
  return db
    .select({
      id: boards.id,
      name: boards.name,
      subject: boards.subject,
      betType: boards.betType,
      unitLabel: boards.unitLabel,
      lockTimeMinutes: boards.lockTimeMinutes,
      timezone: boards.timezone,
      role: boardMembers.role,
      memberCount: sql<number>`(
        select count(*)::int from ${boardMembers} bm where bm.board_id = ${boards.id}
      )`,
    })
    .from(boardMembers)
    .innerJoin(boards, eq(boardMembers.boardId, boards.id))
    .where(eq(boardMembers.userId, userId))
    .orderBy(sql`${boards.createdAt} desc`)
}

/** One board + the viewer's membership row. Null membership = not a member. */
export async function getBoardForUser(boardId: string, userId: string) {
  const rows = await db
    .select({ board: boards, membership: boardMembers })
    .from(boards)
    .leftJoin(
      boardMembers,
      sql`${boardMembers.boardId} = ${boards.id} and ${boardMembers.userId} = ${userId}`,
    )
    .where(eq(boards.id, boardId))
    .limit(1)
  return rows[0] ?? null
}

/** Members of a board with display info — enumerated user columns only. */
export async function getBoardMembers(boardId: string) {
  return db
    .select({
      userId: users.id,
      username: users.username,
      displayName: users.displayName,
      role: boardMembers.role,
      joinedAt: boardMembers.joinedAt,
    })
    .from(boardMembers)
    .innerJoin(users, eq(boardMembers.userId, users.id))
    .where(eq(boardMembers.boardId, boardId))
    .orderBy(boardMembers.joinedAt)
}
