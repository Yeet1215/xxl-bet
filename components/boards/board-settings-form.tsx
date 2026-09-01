'use client'

import { useActionState, useEffect, useRef } from 'react'

import { updateBoardSettings, type BoardActionState } from '@/lib/actions/boards'
import type { Board } from '@/lib/db/schema'
import { formatMinutes } from '@/lib/utils/tz'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'

export function BoardSettingsForm({ board }: { board: Board }) {
  const [state, action, pending] = useActionState<BoardActionState, FormData>(
    updateBoardSettings,
    undefined,
  )
  const { showToast } = useToast()

  // handledStateRef guard (CLAUDE.md gotcha) — toast BOTH outcomes.
  const handledStateRef = useRef<BoardActionState>(undefined)
  useEffect(() => {
    if (state && state !== handledStateRef.current) {
      handledStateRef.current = state
      if ('error' in state) showToast(state.error, 'error')
      else if (state.ok) showToast('Settings saved', 'success')
    }
  }, [state, showToast])

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-[12px] border border-border bg-surface-1 p-5"
    >
      <input type="hidden" name="boardId" value={board.id} />
      <Field label="Board name" name="name" required maxLength={60} defaultValue={board.name} />
      <Field
        label="What are you betting on?"
        name="subject"
        required
        maxLength={100}
        defaultValue={board.subject}
      />
      {board.betType === 'number' && (
        <Field
          label="Unit (shown after the number)"
          name="unitLabel"
          maxLength={20}
          defaultValue={board.unitLabel ?? ''}
          placeholder="visits"
        />
      )}
      <Field
        label="Bets lock at"
        name="lockTime"
        type="time"
        required
        defaultValue={formatMinutes(board.lockTimeMinutes)}
        className="font-mono"
      />
      {board.betType !== 'yesno' ? (
        <Field
          label={
            board.betType === 'time' ? 'Scoring window (minutes)' : 'Scoring window (± value)'
          }
          name="windowSize"
          type="number"
          inputMode="numeric"
          required
          min={1}
          max={1000000}
          defaultValue={board.windowSize}
          className="font-mono"
        />
      ) : (
        <input type="hidden" name="windowSize" value={board.windowSize} />
      )}
      <Field
        label="Max points per round"
        name="maxPoints"
        type="number"
        inputMode="numeric"
        required
        min={1}
        max={1000}
        defaultValue={board.maxPoints}
        className="font-mono"
      />
      {board.betType !== 'yesno' ? (
        <Field
          label="Exact-hit multiplier"
          name="exactMultiplier"
          type="number"
          inputMode="numeric"
          required
          min={1}
          max={10}
          defaultValue={board.exactMultiplier}
          className="font-mono"
        />
      ) : (
        <input type="hidden" name="exactMultiplier" value={board.exactMultiplier} />
      )}

      {state && 'error' in state && (
        <p className="text-sm font-medium text-danger">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save settings'}
      </Button>
    </form>
  )
}
