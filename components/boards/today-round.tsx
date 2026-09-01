import type { Board, Round } from '@/lib/db/schema'
import type { RoundBet } from '@/lib/queries/rounds'
import { formatMinutes, timeOfDayInTz } from '@/lib/utils/tz'
import { formatBetValue, formatRoundDate } from '@/lib/utils/format'
import { Stamp } from '@/components/ui/stamp'
import { BetForm } from '@/components/boards/bet-form'
import { DecideForm } from '@/components/boards/decide-form'
import { RequestDecideForm } from '@/components/boards/request-decide-form'
import { DecideRequests } from '@/components/boards/decide-requests'
import { ExactConfetti } from '@/components/boards/exact-confetti'
import { NextRoundCountdown } from '@/components/boards/next-round-countdown'

type PendingRequest = {
  id: string
  displayName: string
  proposedOutcomeValue: number
}

type TodayRoundProps = {
  board: Board
  roundDate: string
  locked: boolean
  round: Round | null
  betRows: RoundBet[]
  viewerId: string
  isOwner: boolean
  pendingRequests: PendingRequest[]
  myPendingValue: number | null
}

// Today's round card, three states:
//  OPEN     typed bet form; who-has-bet with values hidden (except your own)
//  LOCKED   full reveal; owner gets Decide + request queue, members Request
//  DECIDED  outcome banner + scored results (closest/exact highlighted)
// The owner's Decide also shows pre-lock — deciding early closes the bet.
export function TodayRound({
  board,
  roundDate,
  locked,
  round,
  betRows,
  viewerId,
  isOwner,
  pendingRequests,
  myPendingValue,
}: TodayRoundProps) {
  const decided = round !== null && round.outcomeValue !== null
  const myBet = betRows.find((bet) => bet.userId === viewerId) ?? null

  const sorted = decided
    ? [...betRows].sort(
        (a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.diffMinutes ?? 0) - (b.diffMinutes ?? 0),
      )
    : locked
      ? [...betRows].sort((a, b) => a.betValue - b.betValue)
      : betRows

  const showDiff = board.betType !== 'yesno'

  return (
    <section className="rounded-[12px] border border-border bg-surface-1 p-4 flex flex-col gap-4">
      {decided && sorted.some((bet) => bet.isExact) && (
        <ExactConfetti roundKey={`${board.id}:${roundDate}`} />
      )}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-text-primary">
          Today · {formatRoundDate(roundDate)}
        </h2>
        {decided ? (
          <Stamp tone="decided">
            Decided ·{' '}
            <span className="font-mono">
              {formatBetValue(round.outcomeValue as number, board.betType, board.unitLabel)}
            </span>
          </Stamp>
        ) : locked ? (
          <Stamp tone="locked">Locked</Stamp>
        ) : (
          <Stamp tone="open">
            Open · locks <span className="font-mono">{formatMinutes(board.lockTimeMinutes)}</span>
          </Stamp>
        )}
      </div>

      {!decided && !locked && (
        <BetForm
          boardId={board.id}
          betType={board.betType}
          unitLabel={board.unitLabel}
          myBetValue={myBet?.betValue ?? null}
        />
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-2">
          {locked || decided ? 'Nobody dared to bet today.' : 'No bets yet. Scared?'}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {sorted.map((bet) => {
            const isMe = bet.userId === viewerId
            const showValue = locked || decided || isMe
            const highlight = decided
              ? bet.isExact
                ? 'bg-success-soft'
                : bet.isClosest
                  ? 'bg-accent-soft'
                  : ''
              : ''
            return (
              <li
                key={bet.userId}
                className={`flex items-center gap-3 px-2 py-2 rounded-[8px] ${highlight}`}
              >
                <span className="w-7 h-7 rounded-full bg-accent-soft text-accent-deep flex items-center justify-center text-xs font-bold shrink-0">
                  {bet.displayName.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 min-w-0 text-sm font-semibold truncate">
                  {bet.displayName}
                  {isMe && <span className="text-text-muted font-normal"> (you)</span>}
                  {decided && bet.isExact && (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.08em] text-success">
                      Clairvoyant
                    </span>
                  )}
                  {decided && bet.isClosest && !bet.isExact && (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.08em] text-accent-deep">
                      {board.betType === 'yesno' ? 'Correct' : 'Closest'}
                    </span>
                  )}
                </span>
                {decided && showDiff && bet.diffMinutes !== null && bet.diffMinutes > 0 && (
                  <span className="font-mono text-xs text-text-muted shrink-0">
                    ±{bet.diffMinutes}
                    {board.betType === 'time' ? 'm' : ''}
                  </span>
                )}
                <span className="font-mono text-sm font-semibold shrink-0">
                  {showValue ? (
                    formatBetValue(bet.betValue, board.betType, board.unitLabel)
                  ) : (
                    // Bet value stays hidden until lock — but WHEN they locked
                    // it in is public (edits update it: late fiddlers exposed).
                    <span className="text-xs font-normal text-text-muted">
                      filled{' '}
                      <span className="font-semibold">
                        {timeOfDayInTz(bet.updatedAt, board.timezone)}
                      </span>
                    </span>
                  )}
                </span>
                {decided && (
                  <span className="font-mono text-sm font-bold text-accent-deep w-14 text-right shrink-0">
                    +{bet.score ?? 0}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {(locked || decided) && <NextRoundCountdown timezone={board.timezone} />}

      {!decided && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          {isOwner ? (
            <>
              {pendingRequests.length > 0 && (
                <DecideRequests
                  requests={pendingRequests}
                  betType={board.betType}
                  unitLabel={board.unitLabel}
                />
              )}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.06em] text-text-muted">
                  Decide the round{locked ? '' : ' (closes betting early)'}
                </span>
                <DecideForm
                  boardId={board.id}
                  roundDate={roundDate}
                  betType={board.betType}
                  unitLabel={board.unitLabel}
                />
              </div>
            </>
          ) : (
            locked && (
              <RequestDecideForm
                boardId={board.id}
                roundDate={roundDate}
                betType={board.betType}
                unitLabel={board.unitLabel}
                myPendingValue={myPendingValue}
              />
            )
          )}
        </div>
      )}

      {decided && isOwner && (
        <details className="border-t border-border pt-3">
          <summary className="cursor-pointer text-xs font-semibold text-text-muted hover:text-text-secondary">
            Wrong outcome? Fix it (scores recompute)
          </summary>
          <div className="pt-3">
            <DecideForm
              boardId={board.id}
              roundDate={roundDate}
              betType={board.betType}
              unitLabel={board.unitLabel}
              currentOutcome={round.outcomeValue}
              submitLabel="Re-decide"
            />
          </div>
        </details>
      )}
    </section>
  )
}
