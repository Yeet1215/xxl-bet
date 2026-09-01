'use client'

import { useActionState, useEffect, useRef } from 'react'

import { placeBet, type BetActionState } from '@/lib/actions/bets'
import type { BetType } from '@/lib/validators/boards'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { ValueInput } from '@/components/boards/value-input'

type BetFormProps = {
  boardId: string
  betType: BetType
  unitLabel: string | null
  myBetValue: number | null
}

export function BetForm({ boardId, betType, unitLabel, myBetValue }: BetFormProps) {
  const [state, action, pending] = useActionState<BetActionState, FormData>(placeBet, undefined)
  const { showToast } = useToast()
  const hasBet = myBetValue !== null

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
        <ValueInput
          name="betValue"
          betType={betType}
          unitLabel={unitLabel}
          defaultValue={myBetValue}
          ariaLabel="Your bet"
        />
        <Button type="submit" disabled={pending} className="shrink-0">
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
