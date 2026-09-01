'use client'

import { useActionState, useEffect, useRef } from 'react'

import { decideRound, type DecideActionState } from '@/lib/actions/decide'
import type { BetType } from '@/lib/validators/boards'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { ValueInput } from '@/components/boards/value-input'

type DecideFormProps = {
  boardId: string
  roundDate: string
  betType: BetType
  unitLabel: string | null
  // Re-decide: prefill with the current outcome the owner wants to fix.
  currentOutcome?: number | null
  submitLabel?: string
}

// Owner-only (the server re-checks). Deciding before lock time doubles as
// "close the bet early" — decided rounds take no more bets.
export function DecideForm({
  boardId,
  roundDate,
  betType,
  unitLabel,
  currentOutcome = null,
  submitLabel = 'Decide',
}: DecideFormProps) {
  const [state, action, pending] = useActionState<DecideActionState, FormData>(
    decideRound,
    undefined,
  )
  const { showToast } = useToast()

  // handledStateRef guard (CLAUDE.md gotcha) — toast BOTH outcomes.
  const handledStateRef = useRef<DecideActionState>(undefined)
  useEffect(() => {
    if (state && state !== handledStateRef.current) {
      handledStateRef.current = state
      if ('error' in state) showToast(state.error, 'error')
      else if (state.ok) showToast('Round decided — scores are in', 'success')
    }
  }, [state, showToast])

  return (
    <form action={action} className="flex gap-2">
      <input type="hidden" name="boardId" value={boardId} />
      <input type="hidden" name="roundDate" value={roundDate} />
      <ValueInput
        name="outcomeValue"
        betType={betType}
        unitLabel={unitLabel}
        defaultValue={currentOutcome}
        ariaLabel="Outcome"
      />
      <Button type="submit" disabled={pending} className="shrink-0">
        {pending ? 'Deciding…' : submitLabel}
      </Button>
    </form>
  )
}
