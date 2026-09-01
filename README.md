# XXL Bet

Office betting pool ("toto") for time-based bets. The founding board: what time
does the perpetually late coworker arrive today? Hidden bets, per-board lock
time, closeness-based scoring (closest wins the round, exact hit = double
points), leaderboards, and an owner-approved outcome flow.

**Docs:** [`CLAUDE.md`](CLAUDE.md) (how to work) · [`BUILD-BRIEF.md`](BUILD-BRIEF.md)
(concept, scoring, data model) · [`DESIGN.md`](DESIGN.md) (visual language) ·
[`chunks.md`](chunks.md) (changelog + roadmap).

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind v4 · Drizzle + Neon Postgres · Vercel · pnpm.

## Development

```bash
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL + AUTH_SECRET
pnpm dev
```

Migrations: `pnpm drizzle-kit generate` → `pnpm drizzle-kit migrate` (and verify —
see the Neon silent-no-op gotcha in `CLAUDE.md`).
