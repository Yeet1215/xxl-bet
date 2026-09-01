import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'
import { getBoardsForUser } from '@/lib/queries/boards'
import { formatMinutes } from '@/lib/utils/tz'
import { BET_TYPE_META } from '@/lib/constants/bet-types'
import { Stamp } from '@/components/ui/stamp'
import { ButtonLink } from '@/components/ui/button-link'
import { JoinBoardForm } from '@/components/boards/join-board-form'

export default async function DashboardPage() {
  // Pages guard with getCurrentUser + redirect, NOT requireUser (CLAUDE.md gotcha).
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const userBoards = await getBoardsForUser(user.id)

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
          {userBoards.map((board) => (
            <li key={board.id}>
              <Link
                href={`/board/${board.id}`}
                className="flex flex-col gap-2 rounded-[12px] border border-border bg-surface-1 p-4 hover:border-accent transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-text-primary">{board.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {board.role === 'owner' && <Stamp tone="open">Owner</Stamp>}
                    <Stamp>{BET_TYPE_META[board.betType].label}</Stamp>
                  </div>
                </div>
                <p className="text-sm text-text-secondary">{board.subject}</p>
                <p className="text-xs text-text-muted">
                  {board.memberCount} {board.memberCount === 1 ? 'player' : 'players'} · locks{' '}
                  <span className="font-mono">{formatMinutes(board.lockTimeMinutes)}</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="rounded-[12px] border border-border bg-surface-1 p-4 flex flex-col gap-3">
        <h2 className="text-sm font-bold text-text-primary">Join a board</h2>
        <JoinBoardForm />
      </section>
    </div>
  )
}
