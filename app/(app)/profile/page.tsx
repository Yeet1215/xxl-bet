import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'
import { getScoredBetsForUser } from '@/lib/queries/stats'
import { deriveBoardStats } from '@/lib/stats'
import { formatBetValue, formatRoundDate } from '@/lib/utils/format'
import { Stamp } from '@/components/ui/stamp'
import { AccountSettings } from '@/components/profile/account-settings'

export const metadata: Metadata = { title: 'Profile — XXL Bet' }

const HISTORY_LIMIT = 20

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const scoredBets = await getScoredBetsForUser(user.id)
  const boardStats = deriveBoardStats(scoredBets)
  const history = [...scoredBets].reverse().slice(0, HISTORY_LIMIT)

  const totals = boardStats.reduce(
    (acc, stats) => ({
      points: acc.points + stats.points,
      played: acc.played + stats.played,
      wins: acc.wins + stats.wins,
      exacts: acc.exacts + stats.exacts,
    }),
    { points: 0, played: 0, wins: 0, exacts: 0 },
  )

  const joined = new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: 'numeric',
  }).format(user.createdAt)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className="w-14 h-14 rounded-full bg-accent-soft text-accent-deep flex items-center justify-center text-xl font-extrabold shrink-0">
          {user.displayName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight truncate">{user.displayName}</h1>
          <p className="text-sm text-text-muted">
            @{user.username} · betting since {joined}
          </p>
        </div>
      </div>

      <section className="grid grid-cols-4 rounded-[12px] border border-border bg-surface-1 divide-x divide-border">
        {(
          [
            ['Points', totals.points],
            ['Played', totals.played],
            ['Wins', totals.wins],
            ['Exact', totals.exacts],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex flex-col items-center gap-0.5 py-4">
            <span className="font-mono text-xl font-bold">{value}</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              {label}
            </span>
          </div>
        ))}
      </section>

      {boardStats.length === 0 ? (
        <div className="rounded-[12px] border border-border bg-surface-1 p-8 text-center flex flex-col items-center gap-2">
          <p className="font-semibold">No decided rounds yet.</p>
          <p className="text-sm text-text-secondary">
            Place a bet on a <Link href="/" className="text-accent font-semibold">board</Link> —
            your stats build from the first decided round.
          </p>
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-text-muted">
            Per board
          </h2>
          <ul className="flex flex-col gap-3">
            {boardStats.map((stats) => (
              <li
                key={stats.boardId}
                className="rounded-[12px] border border-border bg-surface-1 p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`/board/${stats.boardId}`}
                    className="font-bold truncate hover:text-accent-deep transition-colors"
                  >
                    {stats.boardName}
                  </Link>
                  <span className="font-mono text-sm font-bold shrink-0">{stats.points} pts</span>
                </div>
                <p className="text-xs text-text-secondary">
                  <span className="font-mono">{stats.played}</span> played ·{' '}
                  <span className="font-mono">{stats.wins}</span> wins ·{' '}
                  <span className="font-mono">{stats.exacts}</span> exact ·{' '}
                  {stats.avgDiff !== null ? (
                    <>
                      avg miss{' '}
                      <span className="font-mono">
                        {stats.avgDiff}
                        {stats.betType === 'time' ? 'm' : ''}
                      </span>
                    </>
                  ) : (
                    <>
                      hit rate{' '}
                      <span className="font-mono">{Math.round(stats.hitRate * 100)}%</span>
                    </>
                  )}
                </p>
                {(stats.currentStreak > 1 || stats.bestStreak > 1) && (
                  <div className="flex gap-1.5">
                    {stats.currentStreak > 1 && (
                      <Stamp tone="accent">🔥 {stats.currentStreak} win streak</Stamp>
                    )}
                    {stats.bestStreak > 1 && stats.bestStreak !== stats.currentStreak && (
                      <Stamp>Best streak {stats.bestStreak}</Stamp>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <AccountSettings displayName={user.displayName} email={user.email} />

      {history.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-text-muted">
            Recent bets
          </h2>
          <ul className="rounded-[12px] border border-border bg-surface-1 divide-y divide-border">
            {history.map((bet) => (
              <li
                key={`${bet.boardId}-${bet.roundDate}`}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{bet.boardName}</p>
                  <p className="text-xs text-text-muted">{formatRoundDate(bet.roundDate)}</p>
                </div>
                <span className="font-mono text-xs text-text-secondary shrink-0">
                  {formatBetValue(bet.betValue, bet.betType, bet.unitLabel)}
                  <span className="text-text-muted"> → </span>
                  {formatBetValue(bet.outcomeValue, bet.betType, bet.unitLabel)}
                </span>
                <span
                  className={`font-mono text-sm font-bold w-14 text-right shrink-0 ${
                    bet.isExact
                      ? 'text-success'
                      : bet.isClosest
                        ? 'text-accent-deep'
                        : 'text-text-secondary'
                  }`}
                >
                  +{bet.score}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
