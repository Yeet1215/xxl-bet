'use client'

import { useActionState, useEffect, useRef } from 'react'

import { submitDecideRequest, type DecideActionState } from '@/lib/actions/decide'
import type { BetType } from '@/lib/validators/boards'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { ValueInput } from '@/components/boards/value-input'

type RequestDecideFormProps = {
  boardId: string
  roundDate: string
  betType: BetType
  unitLabel: string | null
  // My already-pending proposal, if any — submitting again updates it.
  myPendingValue: number | null
}

export function RequestDecideForm({
  boardId,
  roundDate,
  betType,
  unitLabel,
  myPendingValue,
}: RequestDecideFormProps) {
  const [state, action, pending] = useActionState<DecideActionState, FormData>(
    submitDecideRequest,
    undefined,
  )
  const { showToast } = useToast()
  const hasPending = myPendingValue !== null

  // handledStateRef guard (CLAUDE.md gotcha) — toast BOTH outcomes.
  const handledStateRef = useRef<DecideActionState>(undefined)
  useEffect(() => {
    if (state && state !== handledStateRef.current) {
      handledStateRef.current = state
      if ('error' in state) showToast(state.error, 'error')
      else if (state.ok) showToast('Sent to the board owner', 'success')
    }
  }, [state, showToast])

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input type="hidden" name="boardId" value={boardId} />
        <input type="hidden" name="roundDate" value={roundDate} />
        <ValueInput
          name="outcomeValue"
          betType={betType}
          unitLabel={unitLabel}
          defaultValue={myPendingValue}
          ariaLabel="Outcome"
        />
        <Button type="submit" variant="secondary" disabled={pending} className="shrink-0">
          {pending ? 'Sending…' : hasPending ? 'Update request' : 'Request to decide'}
        </Button>
      </div>
      <p className="text-xs text-text-muted">
        {hasPending
          ? 'Waiting for the owner to approve or deny your proposal.'
          : 'Saw the outcome? Propose it — the owner confirms.'}
      </p>
    </form>
  )
}
