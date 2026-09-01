# Claude Development Guidelines for XXL Bet

> Source of truth for *how* to work in this repo. If anything else conflicts with
> this file, this file wins. Flag rules that look wrong instead of silently
> working around them. This project deliberately mirrors the fitapp conventions
> (`~/fitapp/CLAUDE.md`) — same owner, same stack, same discipline — but this
> file stands alone: everything needed to work here is in THIS repo's docs.

## Project files — read in this order

1. **`CLAUDE.md`** (this file) — behavioral rules, stack, conventions, deployment, durable gotchas.
2. **`DESIGN.md`** — visual tokens, layout, interaction patterns. Read before any UI work.
3. **`BUILD-BRIEF.md`** — product concept, scoring spec, data model, flows, permissions. Read before starting a chunk.
4. **`chunks.md`** — the chunk ledger / changelog: compact, one-line-per-chunk summaries of what shipped + what's planned. The *detailed* per-chunk plan lives in `.claude-notes/chunk-NN-plan.md`.
5. **`AGENTS.md`** — scaffold-generated Next.js 16 agent hints (points at the framework docs bundled in `node_modules/next/dist/docs/`). Consult when unsure about a Next 16 API.

**Working notes — `.claude-notes/` (gitignored, open when you need depth):**
- `chunk-NN-plan.md` — full design/decisions per substantial chunk (compact summary goes in `chunks.md`).
- `tech-debt-watchlist.md` — smells/drift logged mid-chunk, triaged at chunk boundaries.
- `in-flight-<topic>.md` — session-resumability state for long chunks.

---

## How to Work With Me (rules)

### 1. Restate before you build
Before non-trivial code, restate task + assumptions in 1–2 sentences. If interpretable two ways, list both and ask. One clarifying question beats an hour of rework.

### 2. Surface tradeoffs, don't hide them
Ambiguous requirement, simpler alternative, real library tradeoff → say so before writing code. Push back when warranted. Don't invent requirements.

### 3. Build the minimum that solves the task
No speculative abstractions, no "in case we need it later". Before abstracting, ask: "is there a second caller today?" If no, inline it.

### 4. Touch only what the task requires
No drive-by renames, reformats, or cleanups. Spot something broken nearby → mention it (or log it in the watchlist), don't silently fix it.

### 5. Read before you write
Read the function/file/schema before editing. Find call sites before changing signatures.

### 6. Verify before claiming done
Done = typechecks + lints clean on edited files + flow exercised + you can describe what you tested. If you can't verify in this environment, say which step is unverified.

### 7. Hard stop on retry loops
3 failed attempts → stop and surface the impasse (what you tried, the error, what you'd check next).

### 8. Match existing patterns
Established pattern (file layout, naming, error handling, design tokens) → follow it. New visual variant → propose as a `DESIGN.md` edit first. Never hardcode colors/spacing/fonts — tokens only.

### 9. Keep docs in sync
`CLAUDE.md` / `DESIGN.md` / `BUILD-BRIEF.md` / `chunks.md` are durable memory. If a change invalidates a recorded decision, update the doc in the same change and **mention the doc edit explicitly in the response**.

**Date-stamp rule:** every tracking `.md` has a `**Last Updated:** YYYY-MM-DD` footer. Bump it on every edit. *Exception:* `CLAUDE.md` itself — bump **only at chunk completion** (mid-chunk edits invalidate the prompt cache; park durable rules in `.claude-notes/in-flight-*.md` and fold them in at chunk-end).

Where things go:
- Token / variant / interaction change → `DESIGN.md`.
- Chunk done → entry in `chunks.md`; schema change → also update the data model in `BUILD-BRIEF.md`.
- New bug-driven gotcha → the **Durable gotchas** section below (this project is small enough for one gotcha list; split into topical files only when it gets unwieldy, like fitapp did).

### 10. Token discipline
- Lint and typecheck **per file**: `pnpm exec eslint --quiet <path>` and `pnpm tsc --noEmit 2>&1 | grep "error TS" | head -80`. Never run `pnpm lint` (whole tree) in-session.
- Trim Bash output (`| tail -50`, `--quiet`). Never run `pnpm dev` through the agent — it runs in the owner's terminal.
- Sub-agents only for broad scans (>10k tokens of tool output); not for single-file edits.
- Long chunks → write `.claude-notes/in-flight-<topic>.md` for session resumability.

### 11. Quality discipline at chunk boundaries
- **Pre-chunk audit:** read the files you'll touch for 2 minutes; log drift in the watchlist, don't silently fix.
- **Post-chunk checklist:** new queries batched + FK-indexed? New UI on tokens + existing components? New server action → Zod + ownership check? New env var → `.env.example`? Migration verified to actually exist in the DB (see gotchas)?
- **Refactor proposals, not refactors:** log to the watchlist; cleanups graduate to their own chunk.

---

## Project Overview

**XXL Bet** — a lighthearted office betting pool ("toto") for time-based bets.
The founding use case: colleagues bet daily on what time a chronically late
coworker arrives. Boards (competitions) have an owner, members join via invite
code, everyone bets a time-of-day per round (day), bets lock at a per-board lock
time and stay **hidden until lock**, the outcome is decided by the board owner
(directly, or by approving a member's "request to decide"), scores are computed
by a closeness formula, and a leaderboard + per-user stats accumulate.

Small-audience app (an office), but built with the same bar as a public one:
Zod on every boundary, ownership checks on every client-supplied ID, no trust in
client input. Full concept, scoring math, data model and flows: `BUILD-BRIEF.md`.

---

## Tech Stack

Deliberately identical to fitapp — proven stack, known gotchas, zero re-learning:

- **Framework:** Next.js 16 (App Router, TS, React 19, React Compiler on by default). Scaffolded 2026-09-01: next 16.3.3, react 19.2.8, tailwindcss 4.3.x.
- **DB:** Postgres via Neon (`@neondatabase/serverless`).
- **ORM:** Drizzle (0.45.x) + drizzle-kit (0.31.x), migrations committed under `drizzle/`.
- **Styling:** Tailwind v4, tokens in `app/globals.css` `@theme` (spec: `DESIGN.md`). Light theme only.
- **Auth:** hand-rolled session-cookie (bcryptjs cost 12, sha256 tokens, 30-day rolling) — same pattern as fitapp: `getCurrentUser()` (request-cached), `requireUser()`.
- **Validation:** Zod on every server action + route handler boundary.
- **Hosting:** Vercel (push to `master` → prod). **PM:** pnpm.

Library rule: prefer the simpler API; one-line justification per new dependency in the commit.

---

## Code Standards

- **TypeScript strict.** Infer types from Drizzle (`typeof users.$inferSelect`) — don't redeclare schema shapes.
- **App Router:** server components by default; Server Actions for mutations; Route Handlers only for real HTTP endpoints. `params`/`searchParams` are Promises — `await` them. React Compiler is on → no manual `useMemo`/`useCallback` without a measured reason.
- **File layout:** `lib/{db,auth,actions,queries,validators,constants,utils}` + `components/{ui,<feature>}/`. One component per file. `lib/db/schema.ts` is the single source of truth.
- **Naming:** server actions `verbCamelCase` (`placeBet`, `decideRound`); DB `snake_case` ↔ TS `camelCase` via Drizzle.
- **DB:** UUID PKs, explicit FK `onDelete`, index every FK, every user-owned row has `userId` (or reaches one via its board/round FK chain).
- **Bet values as integers:** `bets.betValue` / `rounds.outcomeValue` are generic **integers** whose meaning follows the board's `betType` — `time` = minutes since midnight (0–1439, board tz; never `time`/`timestamp` columns), `number` = the integer itself, `yesno` = 1/0. Diff math and scoring stay integer-pure; format (`HH:MM`, unit label, Yes/No) only at the UI edge.
- **Don'ts:** ❌ `// TODO` without a chunk/issue note. ❌ state libraries. ❌ date libraries (Intl + the minutes-integer convention cover this app; see gotchas).

---

## Deployment

- **Hosting:** Vercel. `master` = production (the only branch for now — no `development` branch in this repo unless the owner introduces one).
- **Env vars:** `DATABASE_URL`, `AUTH_SECRET`. Document every new one in `.env.example`.
- **Migrations:** `drizzle-kit migrate` via `prebuild` on Vercel. **Never `drizzle-kit push` against a deployed env.**

```bash
pnpm tsc --noEmit 2>&1 | grep "error TS" | head -80 # type check (trimmed)
pnpm exec eslint --quiet path/to/file.tsx           # lint per file
pnpm drizzle-kit generate                           # migration from schema
pnpm drizzle-kit migrate                            # apply migrations
```

---

## Durable gotchas

Seeded from fitapp's battle scars (same stack — these WILL apply here); add new
bug-driven rules to this list as they're earned.

- **`drizzle-kit migrate` against Neon can silently no-op** — prints "applied successfully" while applying nothing (hit 5+ times in fitapp). After every local migrate, **verify the table/column/index actually exists** (`information_schema`). Recovery recipe: apply the migration SQL directly via a one-off `@neondatabase/serverless` script, then insert the file's sha256 into `drizzle.__drizzle_migrations` with the `when` from `drizzle/meta/_journal.json`. A reusable dry-run/apply script exists at `~/fitapp/.claude-notes/db-repair.mjs` — copy it here when first needed.
- **Caching:** if a query is ever wrapped in `unstable_cache`, use **`updateTag`** (single-arg, read-your-own-writes) from server actions — `revalidateTag(tag)` is deprecated in Next 16. Key + tag caches **per user**. And `unstable_cache` JSON-serializes returns — `Set`/`Date` silently corrupt.
- **Drizzle null comparisons:** `isNull(col)`, never `eq(col, null)` (fails typecheck in 0.45+). Date comparisons: `gt(col, new Date())`, not `sql` fragments inside `and()`.
- **Zod + numbers from forms:** `z.preprocess` → `coerce.number().int()` so empty strings become `null`, not `0`.
- **Timezone:** Vercel runs UTC. "Today" and "is the round locked?" must be computed in the **board's timezone** (default `Europe/Amsterdam`) via `Intl.DateTimeFormat` — never `new Date().getHours()` on the server. The helper lives in `lib/utils/tz.ts` (chunk 1); don't fork a second implementation.
- **Enumerate `users` columns in queries that feed public/other-user surfaces** — never `select *` (leaks `passwordHash`).
- **Toast every mutation outcome** (success and error): `if (result?.error) showToast(result.error, 'error')`. Toast a11y: `role="status"` + `aria-live="polite"`.
- **`useActionState` success effects must guard against the same state object firing twice** (double-toast bug): `handledStateRef` pattern — `if (state && state !== handledStateRef.current && state.success) { handledStateRef.current = state; ... }`.
- **iOS-reliable form controls:** native `<input>` elements, never a styled `<button role="switch">`+onClick (iOS Safari swallows taps intermittently). Selection controls that filter their options: plain buttons driving `useState` + a hidden input carrying the value.
- **pnpm 11 build approvals:** `pnpm-workspace.yaml` `allowBuilds` must have real `true` values — pnpm scaffolds it with literal "set this to true or false" placeholder text that breaks install.
- **Auth guards: `requireUser()` (throws) is for server actions only.** Pages and layouts guard with `getCurrentUser()` + `redirect('/login')`. Next renders layout and page **in parallel**, so a page that throws UNAUTHENTICATED logs a noisy error stack on every logged-out visit even though the layout's redirect wins (hit on day one, chunk 1).

---

**Version:** 2026-Q3
**Last Updated:** 2026-09-01 (Chunk 4 complete: deciding & scoring — pure `lib/scoring.ts` + vitest (`pnpm test`, first test infra), decide/request/approve/deny actions, DECIDED results view, past-undecided owner list, shared `<ValueInput>`. Re-decide = anytime-by-owner (BUILD-BRIEF updated). No migration. — Chunk 3: rounds & betting. — Chunk 2: bet types + boards CRUD, migrations `0001`/`0002`. — Chunk 1: migration `0000`, auth, tz, primitives. — Chunk 0: scaffold.)
