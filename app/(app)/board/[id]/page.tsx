import { notFound, redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'
import { getBoardForUser, getBoardMembers } from '@/lib/queries/boards'
import { formatMinutes } from '@/lib/utils/tz'
import { BET_TYPE_META } from '@/lib/constants/bet-types'
import { Stamp } from '@/components/ui/stamp'
import { ButtonLink } from '@/components/ui/button-link'
import { InviteCode } from '@/components/boards/invite-code'

export default async function BoardPage({ params }: PageProps<'/board/[id]'>) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params
  const row = await getBoardForUser(id, user.id)
  // Boards are members-only; non-members (and bad ids) see a 404, not a teaser.
  if (!row || !row.membership) notFound()
  const { board, membership } = row
  const isOwner = membership.role === 'owner'

  const members = await getBoardMembers(board.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight truncate">{board.name}</h1>
          <p className="text-sm text-text-secondary mt-1">{board.subject}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <Stamp>{BET_TYPE_META[board.betType].label}</Stamp>
            <Stamp tone="locked">
              Locks <span className="font-mono">{formatMinutes(board.lockTimeMinutes)}</span>
            </Stamp>
          </div>
        </div>
        {isOwner && (
          <ButtonLink
            href={`/board/${board.id}/settings`}
            variant="secondary"
            className="shrink-0"
          >
            Settings
          </ButtonLink>
        )}
      </div>

      <section className="rounded-[12px] border border-dashed border-border bg-surface-1 p-6 text-center flex flex-col items-center gap-1">
        <p className="font-semibold">Today&apos;s round lands here next.</p>
        <p className="text-sm text-text-secondary">
          Placing bets arrives in the next chunk — invite the others in the meantime.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-text-muted">
          Players ({members.length})
        </h2>
        <ul className="rounded-[12px] border border-border bg-surface-1 divide-y divide-border">
          {members.map((member) => (
            <li key={member.userId} className="flex items-center gap-3 px-4 py-3">
              <span className="w-8 h-8 rounded-full bg-accent-soft text-accent-deep flex items-center justify-center text-sm font-bold shrink-0">
                {member.displayName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{member.displayName}</p>
                <p className="text-xs text-text-muted truncate">@{member.username}</p>
              </div>
              {member.role === 'owner' && <Stamp tone="open">Owner</Stamp>}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-text-muted">
          Invite a colleague
        </h2>
        <InviteCode code={board.inviteCode} />
      </section>
    </div>
  )
}
