import { type ReactNode } from 'react'

type Tone = 'open' | 'locked' | 'decided' | 'neutral'

// Status stamps (DESIGN.md): small uppercase soft-tinted pills. One component,
// four tones — never ad-hoc pill markup elsewhere.
const tones: Record<Tone, string> = {
  open: 'bg-accent-soft text-accent-deep',
  locked: 'bg-surface-2 text-text-secondary',
  decided: 'bg-success-soft text-success',
  neutral: 'bg-surface-1 text-text-muted',
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
