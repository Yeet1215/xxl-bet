import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'
import { getBoardForUser, getBoardMembers } from '@/lib/queries/boards'
import { BET_TYPE_META } from '@/lib/constants/bet-types'
import { Stamp } from '@/components/ui/stamp'
import { BoardSettingsForm } from '@/components/boards/board-settings-form'
import { InviteCode } from '@/components/boards/invite-code'
import {
  KickMemberButton,
  RegenerateCodeButton,
} from '@/components/boards/membership-buttons'

export const metadata: Metadata = { title: 'Board settings — XXL Bet' }

export default async function BoardSettingsPage({
  params,
}: PageProps<'/board/[id]/settings'>) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params
  const row = await getBoardForUser(id, user.id)
  if (!row || !row.membership) notFound()
  // Members can see the board; only the owner belongs here.
  if (row.board.ownerId !== user.id) redirect(`/board/${id}`)

  const members = await getBoardMembers(row.board.id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Board Settings</h1>
        <div className="flex items-center gap-2 mt-2">
          <Stamp>{BET_TYPE_META[row.board.betType].label}</Stamp>
          <span className="text-xs text-text-muted">
            Bet type is fixed — old bets would stop making sense.
          </span>
        </div>
      </div>
      <BoardSettingsForm board={row.board} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-text-muted">
          Invite code
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <InviteCode code={row.board.inviteCode} />
          </div>
          <RegenerateCodeButton boardId={row.board.id} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-text-muted">
          Members (<span className="font-mono">{members.length}</span>)
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
              {member.role === 'owner' ? (
                <Stamp tone="accent">Owner</Stamp>
              ) : (
                <KickMemberButton
                  boardId={row.board.id}
                  userId={member.userId}
                  displayName={member.displayName}
                />
              )}
            </li>
          ))}
        </ul>
        <p className="text-xs text-text-muted">
          Removing someone keeps their old bets in decided rounds — they can rejoin with the
          invite code (rotate it first if that&apos;s the point).
        </p>
      </section>
    </div>
  )
}
