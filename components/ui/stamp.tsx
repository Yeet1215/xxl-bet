import { type ReactNode } from 'react'

type Tone = 'open' | 'locked' | 'decided' | 'neutral' | 'accent'

// Status stamps (DESIGN.md): small uppercase soft-tinted pills. One component,
// five tones — never ad-hoc pill markup elsewhere. `open/locked/decided` are
// ROUND states only; `accent` is for non-state highlights (Owner, streaks);
// `neutral` for labels (bet type). neutral is surface-2 so it stays visible
// on surface-1 cards.
const tones: Record<Tone, string> = {
  open: 'bg-accent-soft text-accent-deep',
  locked: 'bg-surface-2 text-text-secondary',
  decided: 'bg-success-soft text-success',
  neutral: 'bg-surface-2 text-text-muted',
  accent: 'bg-accent-soft text-accent-deep',
}

export function Stamp({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
