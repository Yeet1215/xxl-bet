# Chunk Ledger — XXL Bet

> The single source of truth for **what shipped per chunk** and **what's
> planned** — this is the project changelog. Compact one-liners here; the full
> per-chunk design lives in `.claude-notes/chunk-NN-plan.md`. Data model:
> `BUILD-BRIEF.md`. Bug-driven rules: `CLAUDE.md → Durable gotchas`.

---

## Shipped

- **0 — Scaffold (2026-09-01).** `create-next-app` (Next 16.3.3 / React 19.2.8 / TS / Tailwind 4.3 / App Router, pnpm), deps: drizzle-orm 0.45 + drizzle-kit 0.31 + `@neondatabase/serverless` + zod + bcryptjs. Light-theme design tokens in `globals.css` (xxldirect palette). Doc set: `CLAUDE.md`, `BUILD-BRIEF.md` (concept + scoring + data model locked), `DESIGN.md`, this ledger, `.env.example`, `.claude-notes/` (gitignored). Git on `master` (only branch). pnpm 11 `allowBuilds` fixed (placeholder-text gotcha). No app code yet.

## Planned

- **1 — Foundations.** Drizzle schema (all 7 tables from BUILD-BRIEF) + migration `0000` + `drizzle.config.ts` + `prebuild` migrate script; Neon wired (`DATABASE_URL`); auth (register/login/logout, sessions, `getCurrentUser`/`requireUser` — port the fitapp pattern); `lib/utils/tz.ts` (board-timezone "today"/now-minutes helpers); base layout (header, fonts, `<Stamp>`, `<Button>`, toast provider). Deploy to Vercel at the end of this chunk (earliest useful moment).
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

*(none yet — `0000` lands in chunk 1)*

> **Migration gotcha:** `drizzle-kit migrate` against Neon can silently no-op —
> always verify the table/column actually exists after migrating. Recipe in
> `CLAUDE.md → Durable gotchas`.

---

**Last Updated:** 2026-09-01 (Chunk 0 shipped; chunks 1–6 planned; deferred backlog seeded.)
