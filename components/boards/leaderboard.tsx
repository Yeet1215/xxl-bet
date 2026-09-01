import type { LeaderboardRow } from '@/lib/queries/stats'
import { Stamp } from '@/components/ui/stamp'

// The board's ranked members list (replaces a separate "players" section —
// one list, both jobs). Top 3 ranks get accent treatment per DESIGN.md.
export function Leaderboard({ rows, viewerId }: { rows: LeaderboardRow[]; viewerId: string }) {
  return (
    <ul className="rounded-[12px] border border-border bg-surface-1 divide-y divide-border">
      {rows.map((row, index) => {
        const rank = index + 1
        const isMe = row.userId === viewerId
        return (
          <li key={row.userId} className="flex items-center gap-3 px-4 py-3">
            <span
              className={`w-6 text-center font-mono text-sm font-bold shrink-0 ${
                rank <= 3 && row.points > 0 ? 'text-accent-deep' : 'text-text-muted'
              }`}
            >
              {rank}
            </span>
            <span className="w-8 h-8 rounded-full bg-accent-soft text-accent-deep flex items-center justify-center text-sm font-bold shrink-0">
              {row.displayName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">
                {row.displayName}
                {isMe && <span className="text-text-muted font-normal"> (you)</span>}
              </p>
              <p className="text-xs text-text-muted">
                <span className="font-mono">{row.played}</span> played ·{' '}
                <span className="font-mono">{row.wins}</span> {row.wins === 1 ? 'win' : 'wins'}
                {row.exacts > 0 && (
                  <>
                    {' '}
                    · <span className="font-mono">{row.exacts}</span> exact
                  </>
                )}
              </p>
            </div>
            {row.role === 'owner' && <Stamp tone="accent">Owner</Stamp>}
            <span className="font-mono text-sm font-bold shrink-0 w-16 text-right">
              {row.points}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
