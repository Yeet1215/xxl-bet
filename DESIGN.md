# Design Language — XXL Bet

Locks the visual and interaction design. Read alongside `CLAUDE.md` and
`BUILD-BRIEF.md` before any UI work. Update when a decision changes.

Aesthetic target: **modern, slightly minimalistic, xxldirect-adjacent** — white
base, bright blue CTAs, navy text, generous whitespace, mono numerals for every
time and score. Feels like a clean internal tool that took itself just seriously
enough. The *copy* carries the joke; the *chrome* stays clean.

---

## UX principles

1. **Don't make me think.** Every screen answers "what do I do here" at a glance. The core daily action — place today's bet — is always one tap from the dashboard.
2. **One primary action per screen** (accent-filled). Everything else is secondary (border/ghost).
3. **Familiar patterns only.** Forms, cards, lists, simple tabs. No novel navigation.
4. **Recognition over recall.** Times always `HH:MM` mono; states always labeled (`OPEN · locks 09:00`, `LOCKED`, `DECIDED 10:15`).
5. **Empty states teach.** A fresh board explains the game + shows the invite code.
6. **Calm over clever.** One accent color. Motion restrained. The banter lives in copy, not confetti (well… maybe an exact-hit gets confetti. That's the one exception, and it must be earned: diff === 0).

## Color tokens (in `app/globals.css` `@theme` — never hardcode)

```
--color-bg:             #ffffff   base
--color-surface-1:      #f5f7fa   cards / panels
--color-surface-2:      #eaeff5   hover / nested surfaces
--color-border:         #dde4ec   1px separators
--color-text-primary:   #18213b   navy (xxldirect primary-color)
--color-text-secondary: #5a6a85
--color-text-muted:     #8a97ab
--color-accent:         #0290e4   bright blue (xxldirect CTA)
--color-accent-deep:    #2d75b8   hover/pressed, focus rings
--color-accent-soft:    #e6f4fd   selected/tinted backgrounds
--color-success:        #00b900   wins, exact hits (xxldirect green)
--color-success-soft:   #e8f8e8
--color-danger:         #e5484d   denials, destructive
--color-danger-soft:    #fdecec
```

**Light theme only** (deliberate; office/daytime app — dark mode is a someday-maybe, don't half-support it). Surfaces separate by 1px borders + the surface scale, not shadows (a single soft shadow allowed on overlays/sheets).

## Typography

- **Sans:** Geist Sans (scaffold default via `next/font`) — UI, headings 600–800 with tight tracking.
- **Mono:** Geist Mono — **every time and score on screen** (`10:15`, `+200`), always with `tabular-nums` (wired globally on `.font-mono` in globals.css). This is the visual signature — no exceptions, no proportional digits anywhere near a number.
- Casing: Title Case for screen titles, sentence case for buttons/body.

## Layout

- **Mobile-first, single column, `max-w-2xl` centered** on desktop — this is a phone-at-the-office app; no desktop-specific layout split (unlike fitapp). Content padding 16px mobile / 24px desktop.
- **Top header** (not bottom nav): logo/wordmark left, nav links (Boards · Profile) + logout right. Sticky, white, 1px bottom border.
- Cards: `surface-1`, 12px radius, 16px padding, 1px border.
- Tap targets ≥44px.

## Component conventions

- **Buttons:** `primary` (accent fill, white text, 600) · `secondary` (white, 1px border, navy text) · `ghost` (borderless, secondary text) · `danger` only as confirmation-step primary. Radius 10px.
- **Inputs:** white bg, 1px border, focus → `accent` border (no glow). Label above, 13px, `text-secondary`. Time inputs: native `<input type="time">` styled to mono (mobile keyboards do the right thing) — fitapp's iOS lesson applies: native controls, never simulated ones.
- **Status stamps:** small uppercase labels, 11px, 0.08em tracking, soft-tinted pills — one `<Stamp>` component, five tones: `open`/`locked`/`decided` are **round states only** (accent-soft, surface-2, success-soft); `accent` for non-state highlights (Owner, streaks — visually = open, semantically distinct); `neutral` (surface-2/muted) for plain labels (bet type). Never reuse a state tone for a non-state label (chunk-7 review fix).
- **Bet rows:** avatar-initial circle · username · mono bet time · (after decide) mono diff + points, closest row tinted `accent-soft`, exact row `success-soft`.
- **Leaderboard rows:** rank number mono, top-3 ranks get accent treatment; points right-aligned mono.
- **Toasts:** top-center, `role="status"` `aria-live="polite"`, success/error on every mutation (fitapp rule).
- **Sheets/modals:** centered modal on all sizes (no bottom-sheet system unless a real need appears — smaller surface area than fitapp).

## Voice & copy

Dry office humor, Dutch-office flavored, never mean-spirited *in the chrome*
(board names/subjects are the users' own risk). Examples: empty round → "No
bets yet. Scared?" · after lock → "Bets are in. Now we wait." · exact hit →
"CLAIRVOYANT — double points." Keep it short; one wink per screen max.

---

**Last Updated:** 2026-09-01 (Chunk 7: stamp tones formalized — state tones vs `accent`/`neutral`, neutral now surface-2. Initial: xxldirect-derived light palette, Geist + mono-numeral signature, single-column layout, component vocabulary, voice.)
