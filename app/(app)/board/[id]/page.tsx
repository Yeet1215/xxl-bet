import { notFound, redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'
import { getBoardForUser, getBoardMembers } from '@/lib/queries/boards'
import {
  getMyPendingDecideRequest,
  getPendingDecideRequests,
  getRoundWithBets,
  getUndecidedPastRounds,
} from '@/lib/queries/rounds'
import { formatMinutes, nowMinutesInTz, todayInTz } from '@/lib/utils/tz'
import { formatRoundDate } from '@/lib/utils/format'
import { BET_TYPE_META } from '@/lib/constants/bet-types'
import { Stamp } from '@/components/ui/stamp'
import { ButtonLink } from '@/components/ui/button-link'
import { InviteCode } from '@/components/boards/invite-code'
import { TodayRound } from '@/components/boards/today-round'
import { DecideForm } from '@/components/boards/decide-form'

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

  // Lock state is derived in the board's timezone — never stored (BUILD-BRIEF).
  const roundDate = todayInTz(board.timezone)
  const locked = nowMinutesInTz(board.timezone) >= board.lockTimeMinutes
  const { round, bets: betRows } = await getRoundWithBets(board.id, roundDate)

  const roundUndecided = round !== null && round.outcomeValue === null
  const pendingRequests =
    isOwner && roundUndecided ? await getPendingDecideRequests(round.id) : []
  const myPendingValue =
    !isOwner && roundUndecided
      ? ((await getMyPendingDecideRequest(round.id, user.id))?.proposedOutcomeValue ?? null)
      : null
  const pastUndecided = isOwner ? await getUndecidedPastRounds(board.id, roundDate) : []

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

      <TodayRound
        board={board}
        roundDate={roundDate}
        locked={locked}
        round={round}
        betRows={betRows}
        viewerId={user.id}
        isOwner={isOwner}
        pendingRequests={pendingRequests}
        myPendingValue={myPendingValue}
      />

      {pastUndecided.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-text-muted">
            Waiting for a result
          </h2>
          <ul className="rounded-[12px] border border-border bg-surface-1 divide-y divide-border">
            {pastUndecided.map((pastRound) => (
              <li key={pastRound.id} className="flex flex-col gap-2 px-4 py-3">
                <span className="text-sm font-semibold">
                  {formatRoundDate(pastRound.roundDate)}
                </span>
                <DecideForm
                  boardId={board.id}
                  roundDate={pastRound.roundDate}
                  betType={board.betType}
                  unitLabel={board.unitLabel}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

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
