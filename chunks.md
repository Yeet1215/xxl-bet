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

- **3 — Rounds & betting (2026-09-01).** No migration. `placeBet` action: Zod boardId → membership check → lock check (derived, board-tz via `nowMinutesInTz`) → value parsed by the BOARD's betType (client never picks the type) → lazy round creation (`onConflictDoNothing` on the (boardId, roundDate) unique index — concurrent first-bets safe) → bet upsert on (roundId, userId); guards decided rounds already (chunk-4 early-decide-proof). `<TodayRound>` card on the board page: OPEN (typed `<BetForm>`: time picker / number+unit / yes-no state-driven buttons + hidden input; who-has-bet list with values hidden as ••• except your own) ↔ LOCKED (full reveal, sorted by value). `lib/utils/format.ts` (`formatBetValue` type-aware, `formatRoundDate` UTC-pure). Copy voice per DESIGN ("No bets yet. Scared?").

- **4 — Deciding & scoring (2026-09-01).** No migration. **`lib/scoring.ts`** pure engine + **first test infra** (vitest, `pnpm test`, 9 tests = executable BUILD-BRIEF spec): time/number closeness (linear decay, closest→max incl. ties + outside-window, exact→×multiplier) and yesno right-or-wrong (multiplier deliberately ignored). **Decide flows:** `decideRound` (owner; works pre-lock = "close the bet early"; re-decide ANYTIME recomputes — BUILD-BRIEF's same-day rule relaxed, doc updated), `submitDecideRequest` (member, post-lock, one pending each, resubmit updates), `approveDecideRequest`/`denyDecideRequest` (ownership via request→round→board join; deciding auto-denies remaining pending). `ensureRound` shared helper (bets + decide + requests all lazy-create). **UI:** round card gains DECIDED state (outcome stamp, results ranked by score, `±diff`, `+points`, closest = accent-soft + "Closest", exact = success-soft + "Clairvoyant"), owner decide form + request queue, member request form, owner "Fix outcome" re-decide disclosure, owner "Waiting for a result" list for past undecided rounds (14 cap). Shared `<ValueInput>` (time/number/yesno) extracted — BetForm/DecideForm/RequestDecideForm. Confetti-on-exact deferred to chunk 6 polish.

- **5 — Leaderboard & profile (2026-09-01).** No migration. **Leaderboard** replaced the board page's "Players" section (one ranked list, both jobs): all members ranked by points → wins → name, played/wins/exacts subline, top-3 rank accents, zero-pointers at the bottom; `getBoardLeaderboard` = two simple queries merged in JS. **Profile** (`/profile`): overall 4-stat strip (points summed across boards — fun over purity), per-board cards (points, played, wins, exacts, avg miss for time/number vs hit-rate % for yesno, 🔥 current + best win streaks), recent-bets history (last 20: bet → outcome, +points colored by closest/exact). Derivation is a pure unit-tested `lib/stats.ts` (5 tests; streaks are over *played* rounds — skipped days don't break them). Suite now 14 tests.

- **6 — Polish pass (2026-09-01).** No migration. Exact-hit confetti (`<ExactConfetti>` — deterministic CSS pieces, fires only when a decided round contains an exact, once per (board, roundDate) per browser via sessionStorage, DESIGN's "one allowed piece of flash"). Branded `app/not-found.tsx` (bad ids / non-member boards) + `app/error.tsx` (special-cases expired-session UNAUTHENTICATED with a log-in path). `app/icon.svg` favicon (accent square, XB). Header truncates long display names. Empty states audited (already teaching); skeleton loading states deliberately skipped at office scale. **v1 roadmap complete — seed the founding board + invite the office.** 🎉

- **7 — Accounts & review hardening (2026-09-01).** Migration `0003` (`users.email` nullable + lower-unique — required at registration, grandfathered accounts null; `password_reset_tokens`; `bets.diff_minutes` smallint→**integer**). **Email + reset:** Resend client ported from fitapp (incl. `skipped` semantics), light-theme reset template, `/forgot-password` (enumeration-safe) + `/reset-password/[token]` (sha256 one-use token, 1h TTL, kills ALL sessions), login "Forgot?" link + reset banner; env: `RESEND_API_KEY`/`EMAIL_FROM`/`APP_URL`. **"Next round in Xh Ym"** countdown on locked/decided rounds (betting-ahead deliberately deferred — owner still deciding). **Final-review fix pass** (2 agents: security + UX): diff overflow fix (one hostile number-bet could permanently wedge deciding), `applyOutcome` now transactional + claim-first on approve (no double-apply / half-decided rounds), owner can't extend lock past reveal (anti-peek), real-date validation, register/request race → friendly errors, login timing equalizer (dummy bcrypt), 00:00-lock guard, keyboard-operable radiogroups (arrows + roving tabindex), yesno no longer fires confetti/"Clairvoyant" (isExact stays false; label reads "Correct"), past undecided rounds now visible to ALL members with request forms + owner queues (requests no longer vanish at midnight), dashboard cards show live open/locked/decided + "Bet now →"/"✓ Bet placed", error page prod-safe (no redacted-message branching), Stamp `accent` tone + visible `neutral`, mono digits on counts, join-input aria-label, details chevron. Suite: 14 tests.

- **8 — QoL & account basics (2026-09-01).** No migration. Profile "Account" section: edit display name + add/change email (grandfathered accounts can now enable password reset; clearing email allowed with warning) + change password (verifies current, kills all other sessions, keeps this browser via a fresh session). Board membership: leave board (members; two-step confirm; bets stay, rejoin restores standings), owner kick member + regenerate invite code (settings page grew members list + code rotation). Dashboard **inline quick-bet**: `BetForm` renders on open-and-unbet cards (card restructured — title links, form outside the anchor; nested interactive elements are invalid HTML); `placeBet` also revalidates `/`.
- **9a — Filled-at visibility (2026-09-01).** Owner request: pre-lock rows now read "filled 08:45" (board-tz submission time via `timeOfDayInTz`) instead of bare `•••` — who's in and when is public, the value never is; edits update the timestamp so late fiddlers are visible. BUILD-BRIEF Lock glossary updated.
- **9 — Seasons (2026-09-01).** No migration — a season IS a calendar month in board tz, derived from `rounds.roundDate` (half-open date-range filters, index-friendly). Leaderboard section → `<LeaderboardTabs>` client toggle **[<Month> | All-time]**, both datasets server-fetched; the season board self-resets on the 1st (the monthly "auto restart"). **Hall of Fame**: winner(s) per closed month (ties share, 🏆 + points, newest first, cap 12; hidden until a month closes) via per-(month,user) SQL aggregate + JS winner-picking. Configurable season length deferred until wanted.

## Planned

*(v2 proposals in `.claude-notes/ROADMAP.md` — owner picks next)*

## Deferred (unscheduled backlog)

- Regenerate invite code / leave board / kick member (add when someone asks).
- Multiple concurrent bet subjects per board / board archiving ("seasons").
- Notifications ("bets lock in 10 min"), PWA install shell.
- Badges/achievements, public read-only board links.

---

## Schema migrations

`0000` base — users, sessions, boards, board_members, rounds, bets, decide_requests · `0001`+`0002` bet-type generalization — betType/unitLabel/windowSize + generic integer value columns, old time-specific columns dropped (two-step because drizzle-kit rename prompts require a TTY) · `0003` users.email + password_reset_tokens + bets.diff_minutes→integer (all applied + verified 2026-09-01).

> **Migration gotcha:** `drizzle-kit migrate` against Neon can silently no-op —
> always verify the table/column actually exists after migrating. Recipe in
> `CLAUDE.md → Durable gotchas`.

---

**Last Updated:** 2026-09-01 (Chunks 0–9 + 9a shipped. 8 = QoL (account settings, leave/kick/rotate-code, dashboard quick-bet); 9 = Seasons (monthly derived, leaderboard toggle, Hall of Fame). Next picks from `.claude-notes/ROADMAP.md`.)
