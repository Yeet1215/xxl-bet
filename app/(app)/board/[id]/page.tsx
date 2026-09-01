import { notFound, redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'
import { getBoardForUser } from '@/lib/queries/boards'
import { getBoardLeaderboard, getSeasonWinners } from '@/lib/queries/stats'
import {
  getMyPendingDecideRequest,
  getPendingDecideRequests,
  getPendingRequestsForRounds,
  getRoundWithBets,
  getUndecidedPastRounds,
} from '@/lib/queries/rounds'
import { formatMinutes, nowMinutesInTz, todayInTz } from '@/lib/utils/tz'
import { formatRoundDate } from '@/lib/utils/format'
import { BET_TYPE_META } from '@/lib/constants/bet-types'
import { Stamp } from '@/components/ui/stamp'
import { ButtonLink } from '@/components/ui/button-link'
import { InviteCode } from '@/components/boards/invite-code'
import { LeaveBoardButton } from '@/components/boards/membership-buttons'
import { TodayRound } from '@/components/boards/today-round'
import { DecideForm } from '@/components/boards/decide-form'
import { DecideRequests } from '@/components/boards/decide-requests'
import { RequestDecideForm } from '@/components/boards/request-decide-form'
import { LeaderboardTabs } from '@/components/boards/leaderboard-tabs'

export default async function BoardPage({ params }: PageProps<'/board/[id]'>) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params
  const row = await getBoardForUser(id, user.id)
  // Boards are members-only; non-members (and bad ids) see a 404, not a teaser.
  if (!row || !row.membership) notFound()
  const { board, membership } = row
  const isOwner = membership.role === 'owner'

  // Season = calendar month in board tz, derived purely from round dates.
  const seasonMonth = todayInTz(board.timezone).slice(0, 7)
  const [seasonLeaderboard, allTimeLeaderboard, hallOfFame] = await Promise.all([
    getBoardLeaderboard(board.id, seasonMonth),
    getBoardLeaderboard(board.id),
    getSeasonWinners(board.id, seasonMonth),
  ])
  const seasonLabel = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${seasonMonth}-01T00:00:00Z`))

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
  // Past undecided rounds are visible to EVERYONE (review fix: a decide
  // request submitted late yesterday must not vanish at midnight) — owners
  // get the approve/deny queue + decide form, members the request form.
  const pastUndecided = await getUndecidedPastRounds(board.id, roundDate)
  const pastRequests = await getPendingRequestsForRounds(pastUndecided.map((r) => r.id))

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
            {pastUndecided.map((pastRound) => {
              const requests = pastRequests.filter((r) => r.roundId === pastRound.id)
              const myPending =
                requests.find((r) => r.requesterId === user.id)?.proposedOutcomeValue ?? null
              return (
                <li key={pastRound.id} className="flex flex-col gap-2 px-4 py-3">
                  <span className="text-sm font-semibold">
                    {formatRoundDate(pastRound.roundDate)}
                  </span>
                  {isOwner ? (
                    <>
                      {requests.length > 0 && (
                        <DecideRequests
                          requests={requests}
                          betType={board.betType}
                          unitLabel={board.unitLabel}
                        />
                      )}
                      <DecideForm
                        boardId={board.id}
                        roundDate={pastRound.roundDate}
                        betType={board.betType}
                        unitLabel={board.unitLabel}
                      />
                    </>
                  ) : (
                    <RequestDecideForm
                      boardId={board.id}
                      roundDate={pastRound.roundDate}
                      betType={board.betType}
                      unitLabel={board.unitLabel}
                      myPendingValue={myPending}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-text-muted">
          Leaderboard (<span className="font-mono">{allTimeLeaderboard.length}</span>)
        </h2>
        <LeaderboardTabs
          seasonLabel={seasonLabel}
          seasonRows={seasonLeaderboard}
          allTimeRows={allTimeLeaderboard}
          viewerId={user.id}
        />
      </section>

      {hallOfFame.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-text-muted">
            Hall of Fame
          </h2>
          <ul className="rounded-[12px] border border-border bg-surface-1 divide-y divide-border">
            {hallOfFame.map((season) => (
              <li key={season.month} className="flex items-center gap-3 px-4 py-3">
                <span aria-hidden>🏆</span>
                <span className="flex-1 min-w-0 text-sm">
                  <span className="font-semibold">{season.winners.join(' & ')}</span>{' '}
                  <span className="text-text-muted">
                    ·{' '}
                    {new Intl.DateTimeFormat('en-GB', {
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'UTC',
                    }).format(new Date(`${season.month}-01T00:00:00Z`))}
                  </span>
                </span>
                <span className="font-mono text-sm font-bold shrink-0">{season.points}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-text-muted">
          Invite a colleague
        </h2>
        <InviteCode code={board.inviteCode} />
      </section>

      {!isOwner && (
        <div className="flex justify-center">
          <LeaveBoardButton boardId={board.id} />
        </div>
      )}
    </div>
  )
}
