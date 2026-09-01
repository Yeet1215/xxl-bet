import type { Board } from '@/lib/db/schema'
import type { RoundBet } from '@/lib/queries/rounds'
import { formatMinutes } from '@/lib/utils/tz'
import { formatBetValue, formatRoundDate } from '@/lib/utils/format'
import { Stamp } from '@/components/ui/stamp'
import { BetForm } from '@/components/boards/bet-form'

type TodayRoundProps = {
  board: Board
  roundDate: string
  locked: boolean
  betRows: RoundBet[]
  viewerId: string
}

// Today's round card. Pre-lock: typed bet form + who-has-bet (values hidden,
// own bet visible). Post-lock: full reveal, sorted by value. Decided rounds
// (results, scores) land in chunk 4.
export function TodayRound({ board, roundDate, locked, betRows, viewerId }: TodayRoundProps) {
  const myBet = betRows.find((bet) => bet.userId === viewerId) ?? null
  const sorted = locked
    ? [...betRows].sort((a, b) => a.betValue - b.betValue)
    : betRows

  return (
    <section className="rounded-[12px] border border-border bg-surface-1 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-text-primary">
          Today · {formatRoundDate(roundDate)}
        </h2>
        {locked ? (
          <Stamp tone="locked">Locked</Stamp>
        ) : (
          <Stamp tone="open">
            Open · locks <span className="font-mono">{formatMinutes(board.lockTimeMinutes)}</span>
          </Stamp>
        )}
      </div>

      {!locked && (
        <BetForm
          boardId={board.id}
          betType={board.betType}
          unitLabel={board.unitLabel}
          myBetValue={myBet?.betValue ?? null}
        />
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-2">
          {locked ? 'Nobody dared to bet today.' : 'No bets yet. Scared?'}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {sorted.map((bet) => {
            const isMe = bet.userId === viewerId
            const showValue = locked || isMe
            return (
              <li key={bet.userId} className="flex items-center gap-3 py-2.5">
                <span className="w-7 h-7 rounded-full bg-accent-soft text-accent-deep flex items-center justify-center text-xs font-bold shrink-0">
                  {bet.displayName.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 min-w-0 text-sm font-semibold truncate">
                  {bet.displayName}
                  {isMe && <span className="text-text-muted font-normal"> (you)</span>}
                </span>
                <span className="font-mono text-sm font-semibold">
                  {showValue ? (
                    formatBetValue(bet.betValue, board.betType, board.unitLabel)
                  ) : (
                    <span className="text-text-muted tracking-widest" aria-label="Hidden until lock">
                      •••
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {locked && sorted.length > 0 && (
        <p className="text-xs text-text-muted text-center">
          Bets are in. Now we wait.
        </p>
      )}
    </section>
  )
}
