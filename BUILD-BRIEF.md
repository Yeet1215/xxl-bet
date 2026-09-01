# Build Brief — XXL Bet

Read alongside `CLAUDE.md` and `DESIGN.md` at session start. This file is the
durable **product + data-model reference**. Chunk-by-chunk history: `chunks.md`.

---

## What this is

A lighthearted office betting pool ("toto") for recurring bets. The founding
board: every workday, colleagues bet on what time a chronically late coworker
arrives (official start 09:00; reality 10:15–11:15). Closest bet wins the
round; a points formula rewards closeness; a leaderboard and per-user stats
accumulate the season. Every board has a **bet type**, fixed at creation
(chunk 2): **time** (a time of day), **number** (any integer — visits,
minutes on the toilet, whatever; optional unit label), or **yes/no**. Time and
number share the closeness formula; yes/no is right-or-wrong.

**Tone:** it's a joke between colleagues — copy can wink (see `DESIGN.md`), but
the mechanics are fair and tamper-proof (hidden bets, lock times, owner-decided
outcomes with an audit trail).

---

## Glossary (locked terminology — use these words in code and UI)

| Term | Meaning |
|---|---|
| **Board** | One competition/leaderboard (e.g. "Arrival time of R."). Has an owner, members, settings, an invite code, and a **bet type** (`time`/`number`/`yesno`, fixed at creation). |
| **Round** | One betting instance on a board — for v1 always a calendar date (one round per day). |
| **Bet** | One member's guess for a round: a **value** whose meaning follows the board's bet type (time = minutes since midnight, number = the integer, yesno = 1/0). One bet per member per round, editable until lock. |
| **Lock** | The per-board time of day after which bets can't be placed/edited and all bets become visible. Before lock, bets are **hidden** (you only see *who* has bet, not *what*). |
| **Outcome** | The actual observed time (e.g. he walked in at 10:15). Generic word — never "arrival time" in shared code/UI components. |
| **Decide** | Resolving a round by setting its outcome → scores computed. Owner-only. |
| **Decide request** | A member's proposal for the outcome ("Request to decide" + input labeled "Outcome"). Owner approves (→ round decided with that outcome) or denies. |

## Roles & permissions

| Action | Member | Board owner |
|---|---|---|
| Place/edit own bet (before lock) | ✅ | ✅ (owners can play too) |
| See others' bets before lock | ❌ (only who-has-bet) | ❌ (owner included — no peeking) |
| See all bets after lock | ✅ | ✅ |
| Submit a **decide request** (after lock) | ✅ | — (owner decides directly) |
| **Decide** round / approve or deny requests | ❌ | ✅ |
| Re-decide (fix a wrong outcome, same day) | ❌ | ✅ (scores recompute) |
| Edit board settings, regenerate invite code | ❌ | ✅ |

Accounts: open registration (username + password). Boards joined via invite code.

---

## Scoring (locked 2026-09-01; generalized to bet types in chunk 2)

Per-board settings (stored on the board, tunable without code changes):
`maxPoints` = 100 · `windowSize` = 60 (in the board's value units) · `exactMultiplier` = 2 · `lockTime` = 09:00 · `timezone` = Europe/Amsterdam

**`time` and `number` boards** — for each bet in a decided round, with
`diff = |bet − outcome|` (minutes for time, plain units for number):

1. **Base:** `diff > windowSize` → 0, else `round(maxPoints × (1 − diff / windowSize))`.
2. **Closest bonus:** the bet(s) with the smallest `diff` get the full `maxPoints` (even if outside the window). Ties: all tied bets get it.
3. **Exact hit:** `diff === 0` → `maxPoints × exactMultiplier` (beats rule 2).

Examples (defaults): exact → 200 · closest at 7 min off → 100 · second-closest 12 min off → 80 · off by 30 → 50 · off by 59 → 2 · off by 75 and not closest → 0.

**`yesno` boards** — right-or-wrong: correct → `maxPoints` (isExact = true), wrong → 0. `windowSize`/`exactMultiplier` unused (hidden in the UI).

Scoring is a **pure function** (`lib/scoring.ts`, chunk 4): `(bets, outcome, settings) → scores`. Deterministic + idempotent, so re-deciding a round just recomputes. Unit-test this one file properly — it's the money logic.

## Round lifecycle

```
(no round row)                      — nothing bet yet that day
   │ first bet of the day (lazily creates the round for board-tz "today")
   ▼
OPEN     bets placed/edited, hidden · until board lockTime (board-tz)
   ▼ lock time passes (derived, not a stored status)
LOCKED   bets visible to members · members may submit decide requests
   ▼ owner decides (directly or by approving a request)
DECIDED  outcome + decidedAt/decidedBy set · scores computed & stored on bets
```

- Lock state is **derived** (`now in board tz ≥ round date + lockTime`), never stored — no cron needed.
- Betting on future dates: allowed for "today" only in v1 (keep it simple).
- No round on days nobody bets — weekends/holidays cost nothing.
- Edge: outcome earlier than lock time (he shows up at 08:50) — owner can still decide after the fact; bets stay cut off at lock time.

---

## Data model (implemented in chunk 1; `lib/db/schema.ts` is the source of truth once it exists)

- **users** — `id`, `username` (unique, lower-indexed), `displayName`, `passwordHash`, `createdAt`.
- **sessions** — fitapp pattern: `id`, `userId`, `tokenHash` (sha256), `expiresAt` (30-day rolling), `createdAt`.
- **boards** — `id`, `ownerId` FK, `name`, `subject` (what's being bet on, shown as the board tagline), `betType` (`time`/`number`/`yesno`, fixed at creation), `unitLabel` (nullable; number boards only), `inviteCode` (unique, 8 chars A–Z/2–9 minus lookalikes, visible to all members), `lockTimeMinutes` (smallint, default 540 = 09:00), `windowSize` (integer, default 60, in value units), `maxPoints` (default 100), `exactMultiplier` (default 2), `timezone` (default `Europe/Amsterdam`), `createdAt`.
- **board_members** — `boardId`, `userId`, `role` (`owner`/`member`), `joinedAt`; unique `(boardId, userId)`.
- **rounds** — `id`, `boardId`, `roundDate` (`date`, in board tz); unique `(boardId, roundDate)`. Decided-state: `outcomeValue` (integer, nullable — null = not decided), `decidedAt`, `decidedById`.
- **bets** — `id`, `roundId`, `userId`, `betValue` (integer, meaning per board betType), `createdAt`, `updatedAt`; unique `(roundId, userId)`. Resolve artifacts (nullable until decided): `score`, `diffMinutes` (naming kept; holds the generic value diff), `isClosest`, `isExact`.
- **decide_requests** — `id`, `roundId`, `requesterId`, `proposedOutcomeValue` (integer), `status` (`pending`/`approved`/`denied`), `createdAt`, `reviewedAt`, `reviewedById`. One *pending* request per (round, requester).

Conventions: UUID PKs, FK indexes, explicit `onDelete` (board cascade → rounds → bets/requests; user delete = restrict for now — revisit if ever needed). **All bet/outcome values are generic integers interpreted via the board's betType** — time = minutes since midnight (see CLAUDE.md gotcha), number = the integer itself, yesno = 1/0.

## Leaderboard & stats (chunk 5)

- **Leaderboard per board:** rank by total `score` (sum over decided rounds). Show: total points, rounds played, wins (isClosest), exact hits.
- **Profile page:** per-board and overall stats — total points, rounds played, win count, exact count, average `diffMinutes` (the "how well do you know him" metric), best/current win streak, bet history list (date · bet · outcome · diff · points).
- All derivable from `bets` — no denormalized counters until proven slow.

## Surfaces (v1)

1. `/login`, `/register` — auth.
2. `/` (dashboard) — your boards + "today" quick-bet per board; create/join board.
3. `/board/[id]` — the board: today's round (bet input before lock; revealed bets after lock; outcome + scored results once decided), leaderboard, recent rounds.
4. `/board/[id]/settings` — owner: name/subject/lock/scoring settings, invite code, members.
5. `/profile` (+ `/profile/[username]`?) — stats + history. v1 can be own-profile only.

Deferred (tracked in `chunks.md`): count-based bets (times per day), multiple bet subjects per board, notifications, PWA, season resets, badges.

---

**Last Updated:** 2026-09-01 (Chunk 2: bet types added — boards carry `betType` time/number/yesno + `unitLabel`; bet/outcome columns generalized to integers (`betValue`/`outcomeValue`/`proposedOutcomeValue`, `windowSize`); scoring spec split per type. Earlier same day: initial brief — concept, glossary, roles, scoring formula, round lifecycle, data model, surfaces; decisions locked with owner: name "XXL Bet", lock+hidden bets, scoring defaults 100/60min/2×, open registration + invite codes, generic "decide/outcome" terminology.)
