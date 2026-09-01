'use client'

import { useState } from 'react'

import type { LeaderboardRow } from '@/lib/queries/stats'
import { Leaderboard } from '@/components/boards/leaderboard'

type LeaderboardTabsProps = {
  seasonLabel: string // e.g. "September"
  seasonRows: LeaderboardRow[]
  allTimeRows: LeaderboardRow[]
  viewerId: string
}

// [This season | All-time] toggle. Both datasets arrive server-rendered —
// switching just swaps arrays, no fetch. Seasons are calendar months, so the
// season board resets itself on the 1st (the monthly "auto restart").
export function LeaderboardTabs({
  seasonLabel,
  seasonRows,
  allTimeRows,
  viewerId,
}: LeaderboardTabsProps) {
  const [tab, setTab] = useState<'season' | 'all'>('season')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5" role="tablist" aria-label="Leaderboard period">
        {(
          [
            ['season', seasonLabel],
            ['all', 'All-time'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`px-3 min-h-[36px] rounded-[10px] border text-xs font-bold transition-colors ${
              tab === key
                ? 'border-accent bg-accent-soft text-accent-deep'
                : 'border-border bg-bg text-text-secondary hover:bg-surface-2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <Leaderboard rows={tab === 'season' ? seasonRows : allTimeRows} viewerId={viewerId} />
    </div>
  )
}
