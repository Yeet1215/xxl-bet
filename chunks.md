# Chunk Ledger — XXL Bet

> The single source of truth for **what shipped per chunk** and **what's
> planned** — this is the project changelog. Compact one-liners here; the full
> per-chunk design lives in `.claude-notes/chunk-NN-plan.md`. Data model:
> `BUILD-BRIEF.md`. Bug-driven rules: `CLAUDE.md → Durable gotchas`.

---

## Shipped

- **0 — Scaffold (2026-09-01).** `create-next-app` (Next 16.3.3 / React 19.2.8 / TS / Tailwind 4.3 / App Router, pnpm), deps: drizzle-orm 0.45 + drizzle-kit 0.31 + `@neondatabase/serverless` + zod + bcryptjs. Light-theme design tokens in `globals.css` (xxldirect palette). Doc set: `CLAUDE.md`, `BUILD-BRIEF.md` (concept + scoring + data model locked), `DESIGN.md`, this ledger, `.env.example`, `.claude-notes/` (gitignored). Git on `master` (only branch). pnpm 11 `allowBuilds` fixed (placeholder-text gotcha). No app code yet.

- **1 — Foundations (2026-09-01).** Migration `0000` (all 7 tables: users, sessions, boards, board_members, rounds, bets, decide_requests; lower(username) unique idx; one-pending-decide-request partial idx) — applied to Neon and **verified** (no silent no-op). Auth: fitapp session pattern (`xxlbet_session` cookie, sha256 token id, 30-day rolling), `registerUser`/`loginUser`/`logoutUser` (Zod, case-insensitive username, enumeration-safe login error), `getCurrentUser`/`requireUser`. `lib/utils/tz.ts` (todayInTz/nowMinutesInTz/formatMinutes/parseTimeToMinutes — the only tz-aware code allowed). UI primitives: `<Button>` (3 variants), `<Stamp>` (open/locked/decided/neutral), `<ToastProvider>` (dedup window, top-center), `<Field>`. Routes: `(auth)` login/register (redirect in when authed), `(app)` layout (redirect out when not) + dashboard placeholder. package.json: typecheck/db:*/prebuild scripts. **No rate limiting yet** (watchlist — required before strangers). Prod build green.

- **2 — Boards + bet types (2026-09-01).** Owner request: boards support bet TYPES. Migrations `0001`+`0002` (two-step add-then-drop — drizzle-kit rename prompts need a TTY): `boards.betType` (`time`/`number`/`yesno`, fixed at creation) + `unitLabel` (number boards), generic integer value columns (`bets.betValue`, `rounds.outcomeValue`, `decide_requests.proposedOutcomeValue`, `boards.windowSize`) replace the time-specific smallints; verified applied, users/sessions untouched. Features: `createBoard` (type picker, conditional unit/scoring fields, 8-char invite code A–Z/2–9 minus lookalikes, collision retry, owner auto-membership), `joinBoard` (idempotent, uppercased code), `updateBoardSettings` (owner-check in WHERE; betType immutable), dashboard board list + join form, `/boards/new`, `/board/[id]` (members list, copyable invite code, today-round placeholder, members-only via notFound), `/board/[id]/settings`. `Field`→`components/ui/`, new `ButtonLink`, `lib/constants/bet-types.ts`. Scoring per type spec'd in BUILD-BRIEF (time+number share closeness; yesno right-or-wrong).

## Planned

- **3 — Rounds & betting.** Lazy round creation, place/edit bet (typed input per betType: time picker / number+unit / yes-no buttons; hidden until lock, who-has-bet indicator), lock derivation + reveal, today-round view on board page.
- **4 — Deciding & scoring.** `lib/scoring.ts` pure function + unit tests (vitest — first test infra); type-aware (closeness for time/number, right-or-wrong for yesno); owner "Decide bet" (outcome input); member "Request to decide" + owner approve/deny queue; score computation + stored resolve artifacts; decided-round results view (diffs, closest, exact, confetti-on-exact).
- **5 — Leaderboard & profile.** Board leaderboard (points, wins, exacts), profile stats (avg diff, streaks) + bet history.
- **6 — Polish pass.** Empty states, copy/voice pass, mobile ergonomics, seed the founding board, invite the colleagues. 🎉

## Deferred (unscheduled backlog)

- Regenerate invite code / leave board / kick member (add when someone asks).
- Multiple concurrent bet subjects per board / board archiving ("seasons").
- Notifications ("bets lock in 10 min"), PWA install shell.
- Badges/achievements, public read-only board links.

---

## Schema migrations

`0000` base — users, sessions, boards, board_members, rounds, bets, decide_requests · `0001`+`0002` bet-type generalization — betType/unitLabel/windowSize + generic integer value columns, old time-specific columns dropped (two-step because drizzle-kit rename prompts require a TTY; all applied + verified 2026-09-01).

> **Migration gotcha:** `drizzle-kit migrate` against Neon can silently no-op —
> always verify the table/column actually exists after migrating. Recipe in
> `CLAUDE.md → Durable gotchas`.

---

**Last Updated:** 2026-09-01 (Chunks 0–2 shipped: scaffold, foundations, boards + bet types (migrations 0001/0002, create/join/settings, dashboard). Chunks 3–6 planned.)
