'use client'

import { useActionState, useEffect, useRef, useState } from 'react'

import { placeBet, type BetActionState } from '@/lib/actions/bets'
import type { BetType } from '@/lib/validators/boards'
import { formatMinutes } from '@/lib/utils/tz'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

type BetFormProps = {
  boardId: string
  betType: BetType
  unitLabel: string | null
  myBetValue: number | null
}

const inputClass =
  'min-h-[44px] px-3 rounded-[10px] bg-bg border border-border text-text-primary ' +
  'placeholder:text-text-muted text-sm font-mono transition-colors ' +
  'focus:outline-none focus:border-accent'

// Typed bet input: time picker / number field / yes-no buttons. All variants
// submit through the single name="betValue" field — the server re-validates
// against the board's own type.
export function BetForm({ boardId, betType, unitLabel, myBetValue }: BetFormProps) {
  const [state, action, pending] = useActionState<BetActionState, FormData>(placeBet, undefined)
  const { showToast } = useToast()
  const hasBet = myBetValue !== null
  // yesno picker: state-driven buttons + hidden input (iOS-safe pattern).
  const [yesno, setYesno] = useState<'1' | '0' | null>(
    myBetValue === null ? null : myBetValue === 1 ? '1' : '0',
  )

  // handledStateRef guard (CLAUDE.md gotcha) — toast BOTH outcomes.
  const handledStateRef = useRef<BetActionState>(undefined)
  useEffect(() => {
    if (state && state !== handledStateRef.current) {
      handledStateRef.current = state
      if ('error' in state) showToast(state.error, 'error')
      else if (state.ok) showToast('Bet locked in', 'success')
    }
  }, [state, showToast])

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input type="hidden" name="boardId" value={boardId} />

        {betType === 'time' && (
          <input
            name="betValue"
            type="time"
            required
            defaultValue={myBetValue !== null ? formatMinutes(myBetValue) : ''}
            aria-label="Your bet (time)"
            className={`flex-1 min-w-0 ${inputClass}`}
          />
        )}

        {betType === 'number' && (
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <input
              name="betValue"
              type="number"
              inputMode="numeric"
              required
              min={-100000000}
              max={100000000}
              defaultValue={myBetValue ?? ''}
              placeholder="0"
              aria-label={`Your bet${unitLabel ? ` (${unitLabel})` : ''}`}
              className={`flex-1 min-w-0 ${inputClass}`}
            />
            {unitLabel && (
              <span className="text-sm text-text-secondary shrink-0">{unitLabel}</span>
            )}
          </div>
        )}

        {betType === 'yesno' && (
          <div
            className="flex-1 flex gap-2"
            role="radiogroup"
            aria-label="Your bet"
          >
            {(['1', '0'] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={yesno === option}
                tabIndex={yesno === option || (yesno === null && option === '1') ? 0 : -1}
                onClick={() => setYesno(option)}
                className={`flex-1 min-h-[44px] rounded-[10px] border text-sm font-bold transition-colors ${
                  yesno === option
                    ? 'border-accent bg-accent-soft text-accent-deep'
                    : 'border-border bg-bg text-text-secondary hover:bg-surface-2'
                }`}
              >
                {option === '1' ? 'Yes' : 'No'}
              </button>
            ))}
            {yesno !== null && <input type="hidden" name="betValue" value={yesno} />}
          </div>
        )}

        <Button
          type="submit"
          disabled={pending || (betType === 'yesno' && yesno === null)}
          className="shrink-0"
        >
          {pending ? 'Saving…' : hasBet ? 'Update' : 'Place bet'}
        </Button>
      </div>
      <p className="text-xs text-text-muted">
        {hasBet
          ? 'You can change your bet until lock.'
          : 'Bets stay hidden from the others until lock.'}
      </p>
    </form>
  )
}
