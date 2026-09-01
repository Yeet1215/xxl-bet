import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// Single source of truth for the data model — the prose spec lives in
// BUILD-BRIEF.md and must be kept in sync (CLAUDE.md rule #9).
//
// Conventions: UUID PKs, explicit onDelete on every FK, index every FK.
// Bet/outcome values are generic INTEGERS whose meaning depends on the board's
// betType: 'time' = minutes since midnight (0–1439, board tz — never
// time/timestamp columns, CLAUDE.md gotcha), 'number' = the number itself,
// 'yesno' = 1/0. rounds.roundDate is a `date` in string mode ('YYYY-MM-DD') —
// never a JS Date.

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: text('username').notNull().unique(),
    displayName: text('display_name').notNull(),
    passwordHash: text('password_hash').notNull(),
    // Required at registration since chunk 7; nullable for the grandfathered
    // pre-email accounts (they can add one later; no email = no password reset).
    email: text('email'),
    // Opt-in (9d): email me when a round I'm in gets decided. Needs email set.
    notifyOnDecide: boolean('notify_on_decide').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Case-insensitive uniqueness: 'Bob' and 'bob' are the same account.
    uniqueIndex('users_username_lower_idx').on(sql`lower(${t.username})`),
    uniqueIndex('users_email_lower_idx').on(sql`lower(${t.email})`),
  ],
)

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // sha256 of the emailed token — the raw token only ever lives in the link.
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('password_reset_tokens_user_idx').on(t.userId)],
)

export const sessions = pgTable(
  'sessions',
  {
    // id = sha256(token) — the raw token only ever lives in the cookie.
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
)

export const boards = pgTable(
  'boards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    // What's being bet on — the board tagline (e.g. "What time does R. arrive?").
    subject: text('subject').notNull(),
    // What kind of value gets bet. Fixed at creation (changing it would make
    // historical bets meaningless). 'time'|'number' share the closeness
    // formula; 'yesno' is right-or-wrong (BUILD-BRIEF → Scoring).
    betType: text('bet_type', { enum: ['time', 'number', 'yesno'] })
      .notNull()
      .default('time'),
    // Display unit for 'number' boards (e.g. "visits", "minutes"). Null otherwise.
    unitLabel: text('unit_label'),
    inviteCode: text('invite_code').notNull().unique(),
    // Scoring + lock settings (see BUILD-BRIEF.md → Scoring). Tunable per board.
    lockTimeMinutes: smallint('lock_time_minutes').notNull().default(540), // 09:00
    // Closeness window in the board's value units (minutes for 'time', the
    // number's own units for 'number'; unused for 'yesno').
    windowSize: integer('window_size').notNull().default(60),
    maxPoints: smallint('max_points').notNull().default(100),
    exactMultiplier: smallint('exact_multiplier').notNull().default(2),
    timezone: text('timezone').notNull().default('Europe/Amsterdam'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('boards_owner_idx').on(t.ownerId)],
)

export const boardMembers = pgTable(
  'board_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    boardId: uuid('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['owner', 'member'] }).notNull().default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('board_members_board_user_idx').on(t.boardId, t.userId),
    index('board_members_user_idx').on(t.userId),
  ],
)

export const rounds = pgTable(
  'rounds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    boardId: uuid('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    // Calendar date in the BOARD's timezone. String mode — no JS Date in play.
    roundDate: date('round_date', { mode: 'string' }).notNull(),
    // Decided-state. null outcome = not decided. Lock state is DERIVED from
    // board.lockTimeMinutes + roundDate (never stored — see BUILD-BRIEF).
    outcomeValue: integer('outcome_value'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decidedById: uuid('decided_by_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
  },
  (t) => [
    uniqueIndex('rounds_board_date_idx').on(t.boardId, t.roundDate),
  ],
)

export const bets = pgTable(
  'bets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roundId: uuid('round_id')
      .notNull()
      .references(() => rounds.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    betValue: integer('bet_value').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    // Resolve artifacts — null until the round is decided; recomputed on
    // re-decide (scoring is pure + idempotent, lib/scoring.ts, chunk 4).
    // score max = maxPoints(1000) × multiplier(10) = 10k, fits smallint;
    // diff is a generic VALUE diff (number boards reach ±2×10⁸) → integer.
    score: smallint('score'),
    diffMinutes: integer('diff_minutes'),
    isClosest: boolean('is_closest'),
    isExact: boolean('is_exact'),
  },
  (t) => [
    uniqueIndex('bets_round_user_idx').on(t.roundId, t.userId),
    index('bets_user_idx').on(t.userId),
  ],
)

export const decideRequests = pgTable(
  'decide_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roundId: uuid('round_id')
      .notNull()
      .references(() => rounds.id, { onDelete: 'cascade' }),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    proposedOutcomeValue: integer('proposed_outcome_value').notNull(),
    status: text('status', { enum: ['pending', 'approved', 'denied'] })
      .notNull()
      .default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedById: uuid('reviewed_by_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
  },
  (t) => [
    index('decide_requests_round_idx').on(t.roundId),
    // One PENDING request per member per round (re-request allowed after a denial).
    uniqueIndex('decide_requests_pending_idx')
      .on(t.roundId, t.requesterId)
      .where(sql`${t.status} = 'pending'`),
  ],
)

export type User = typeof users.$inferSelect
export type Board = typeof boards.$inferSelect
export type BoardMember = typeof boardMembers.$inferSelect
export type Round = typeof rounds.$inferSelect
export type Bet = typeof bets.$inferSelect
export type DecideRequest = typeof decideRequests.$inferSelect
