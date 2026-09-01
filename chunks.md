# Chunk Ledger — XXL Bet

> The single source of truth for **what shipped per chunk** and **what's
> planned** — this is the project changelog. Compact one-liners here; the full
> per-chunk design lives in `.claude-notes/chunk-NN-plan.md`. Data model:
> `BUILD-BRIEF.md`. Bug-driven rules: `CLAUDE.md → Durable gotchas`.

---

## Shipped

- **0 — Scaffold (2026-09-01).** `create-next-app` (Next 16.3.3 / React 19.2.8 / TS / Tailwind 4.3 / App Router, pnpm), deps: drizzle-orm 0.45 + drizzle-kit 0.31 + `@neondatabase/serverless` + zod + bcryptjs. Light-theme design tokens in `globals.css` (xxldirect palette). Doc set: `CLAUDE.md`, `BUILD-BRIEF.md` (concept + scoring + data model locked), `DESIGN.md`, this ledger, `.env.example`, `.claude-notes/` (gitignored). Git on `master` (only branch). pnpm 11 `allowBuilds` fixed (placeholder-text gotcha). No app code yet.

- **1 — Foundations (2026-09-01).** Migration `0000` (all 7 tables: users, sessions, boards, board_members, rounds, bets, decide_requests; lower(username) unique idx; one-pending-decide-request partial idx) — applied to Neon and **verified** (no silent no-op). Auth: fitapp session pattern (`xxlbet_session` cookie, sha256 token id, 30-day rolling), `registerUser`/`loginUser`/`logoutUser` (Zod, case-insensitive username, enumeration-safe login error), `getCurrentUser`/`requireUser`. `lib/utils/tz.ts` (todayInTz/nowMinutesInTz/formatMinutes/parseTimeToMinutes — the only tz-aware code allowed). UI primitives: `<Button>` (3 variants), `<Stamp>` (open/locked/decided/neutral), `<ToastProvider>` (dedup window, top-center), `<Field>`. Routes: `(auth)` login/register (redirect in when authed), `(app)` layout (redirect out when not) + dashboard placeholder. package.json: typecheck/db:*/prebuild scripts. **No rate limiting yet** (watchlist — required before strangers). Prod build green.

## Planned

- **2 — Boards.** Create board (name, subject, settings), invite code join flow, members list, board settings page (owner), dashboard listing your boards.
- **3 — Rounds & betting.** Lazy round creation, place/edit bet (hidden until lock, who-has-bet indicator), lock derivation + reveal, today-round view on board page.
- **4 — Deciding & scoring.** `lib/scoring.ts` pure function + unit tests; owner "Decide bet" (outcome input); member "Request to decide" + owner approve/deny queue; score computation + stored resolve artifacts; decided-round results view (diffs, closest, exact, confetti-on-exact).
- **5 — Leaderboard & profile.** Board leaderboard (points, wins, exacts), profile stats (avg diff, streaks) + bet history.
- **6 — Polish pass.** Empty states, copy/voice pass, mobile ergonomics, seed the founding board, invite the colleagues. 🎉

## Deferred (unscheduled backlog)

- Count-based bets (e.g. toilet visits per day) — needs a `betType` on boards; mechanics otherwise identical.
- Multiple concurrent bet subjects per board / board archiving ("seasons").
- Notifications ("bets lock in 10 min"), PWA install shell.
- Badges/achievements, public read-only board links.

---

## Schema migrations

`0000` base — users, sessions, boards, board_members, rounds, bets, decide_requests (applied + verified 2026-09-01).

> **Migration gotcha:** `drizzle-kit migrate` against Neon can silently no-op —
> always verify the table/column actually exists after migrating. Recipe in
> `CLAUDE.md → Durable gotchas`.

---

**Last Updated:** 2026-09-01 (Chunks 0–1 shipped: scaffold + foundations — schema/migration 0000 verified, auth, tz helper, UI primitives, auth+app route groups. Chunks 2–6 planned.)
