import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'
import { getBoardsForUser } from '@/lib/queries/boards'
import { getTodayRoundStatuses } from '@/lib/queries/rounds'
import { formatMinutes } from '@/lib/utils/tz'
import { BET_TYPE_META } from '@/lib/constants/bet-types'
import { Stamp } from '@/components/ui/stamp'
import { ButtonLink } from '@/components/ui/button-link'
import { JoinBoardForm } from '@/components/boards/join-board-form'
import { BetForm } from '@/components/boards/bet-form'

export default async function DashboardPage() {
  // Pages guard with getCurrentUser + redirect, NOT requireUser (CLAUDE.md gotcha).
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const userBoards = await getBoardsForUser(user.id)
  const todayStatuses = await getTodayRoundStatuses(userBoards, user.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Your Boards</h1>
        <ButtonLink href="/boards/new">New board</ButtonLink>
      </div>

      {userBoards.length === 0 ? (
        <div className="rounded-[12px] border border-border bg-surface-1 p-8 text-center flex flex-col items-center gap-2">
          <p className="font-semibold">No boards yet.</p>
          <p className="text-sm text-text-secondary">
            Create one to start a bet, or join a colleague&apos;s board with their
            invite code below.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {userBoards.map((board) => {
            const status = todayStatuses.get(board.id)
            // Card is a div, not one big <Link> — the quick-bet form nests
            // interactive elements, which is invalid inside an anchor.
            return (
              <li key={board.id}>
                <div className="flex flex-col gap-2 rounded-[12px] border border-border bg-surface-1 p-4 hover:border-accent transition-colors">
                  <Link href={`/board/${board.id}`} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-text-primary">{board.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {board.role === 'owner' && <Stamp tone="accent">Owner</Stamp>}
                        <Stamp>{BET_TYPE_META[board.betType].label}</Stamp>
                        {status && (
                          <Stamp
                            tone={
                              status.state === 'decided'
                                ? 'decided'
                                : status.state === 'locked'
                                  ? 'locked'
                                  : 'open'
                            }
                          >
                            {status.state}
                          </Stamp>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary">{board.subject}</p>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-text-muted">
                        <span className="font-mono">{board.memberCount}</span>{' '}
                        {board.memberCount === 1 ? 'player' : 'players'} · locks{' '}
                        <span className="font-mono">{formatMinutes(board.lockTimeMinutes)}</span>
                      </p>
                      {status?.state === 'open' && status.hasBet && (
                        <span className="text-xs font-semibold text-success">✓ Bet placed</span>
                      )}
                    </div>
                  </Link>
                  {/* Inline quick-bet: the daily action, one tap from home. */}
                  {status?.state === 'open' && !status.hasBet && (
                    <div className="border-t border-border pt-3">
                      <BetForm
                        boardId={board.id}
                        betType={board.betType}
                        unitLabel={board.unitLabel}
                        myBetValue={null}
                      />
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <section className="rounded-[12px] border border-border bg-surface-1 p-4 flex flex-col gap-3">
        <h2 className="text-sm font-bold text-text-primary">Join a board</h2>
        <JoinBoardForm />
      </section>
    </div>
  )
}
