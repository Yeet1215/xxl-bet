'use client'

import { useActionState, useEffect, useRef, useState } from 'react'

import { createBoard, type BoardActionState } from '@/lib/actions/boards'
import { BET_TYPES, type BetType } from '@/lib/validators/boards'
import { BET_TYPE_META } from '@/lib/constants/bet-types'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'

export function CreateBoardForm() {
  const [state, action, pending] = useActionState<BoardActionState, FormData>(
    createBoard,
    undefined,
  )
  const { showToast } = useToast()
  // Type picker: state-driven buttons + hidden input carrying the value
  // (iOS-safe selection-control pattern, CLAUDE.md gotcha).
  const [betType, setBetType] = useState<BetType>('time')

  // handledStateRef guard (CLAUDE.md gotcha).
  const handledStateRef = useRef<BoardActionState>(undefined)
  useEffect(() => {
    if (state && state !== handledStateRef.current && 'error' in state) {
      handledStateRef.current = state
      showToast(state.error, 'error')
    }
  }, [state, showToast])

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-[12px] border border-border bg-surface-1 p-5"
    >
      <Field
        label="Board name"
        name="name"
        required
        maxLength={60}
        placeholder="Late Again FC"
      />
      <Field
        label="What are you betting on?"
        name="subject"
        required
        maxLength={100}
        placeholder="What time does R. walk in?"
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-text-secondary">Bet type</span>
        <div
          className="flex gap-1.5"
          role="radiogroup"
          aria-label="Bet type"
          onKeyDown={(e) => {
            // Radio keyboard semantics: arrows move selection AND focus.
            let delta = 0
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') delta = 1
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') delta = -1
            if (delta === 0) return
            e.preventDefault()
            const idx = BET_TYPES.indexOf(betType)
            const nextIdx = (idx + delta + BET_TYPES.length) % BET_TYPES.length
            setBetType(BET_TYPES[nextIdx])
            e.currentTarget
              .querySelectorAll<HTMLButtonElement>('[role="radio"]')
              [nextIdx]?.focus()
          }}
        >
          {BET_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={betType === t}
              tabIndex={betType === t ? 0 : -1}
              onClick={() => setBetType(t)}
              className={`flex-1 min-h-[44px] rounded-[10px] border text-sm font-semibold transition-colors ${
                betType === t
                  ? 'border-accent bg-accent-soft text-accent-deep'
                  : 'border-border bg-bg text-text-secondary hover:bg-surface-2'
              }`}
            >
              {BET_TYPE_META[t].label}
            </button>
          ))}
        </div>
        <p className="text-xs text-text-muted">{BET_TYPE_META[betType].hint}</p>
        <input type="hidden" name="betType" value={betType} />
      </div>

      {betType === 'number' && (
        <Field
          label="Unit (shown after the number)"
          name="unitLabel"
          maxLength={20}
          placeholder="visits"
        />
      )}

      <Field
        label="Bets lock at"
        name="lockTime"
        type="time"
        required
        defaultValue="09:00"
        className="font-mono"
      />

      <details className="group rounded-[10px] border border-border bg-bg">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-text-secondary flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="text-text-muted text-xs transition-transform duration-150 group-open:rotate-90"
            >
              ▶
            </span>
            Scoring settings
          </span>
          <span className="text-xs text-text-muted group-open:hidden">defaults are fine</span>
        </summary>
        <div className="flex flex-col gap-4 px-4 pb-4">
          {betType !== 'yesno' && (
            <Field
              label={betType === 'time' ? 'Scoring window (minutes)' : 'Scoring window (± value)'}
              name="windowSize"
              type="number"
              inputMode="numeric"
              required
              min={1}
              max={1000000}
              defaultValue={60}
              className="font-mono"
            />
          )}
          <Field
            label="Max points per round"
            name="maxPoints"
            type="number"
            inputMode="numeric"
            required
            min={1}
            max={1000}
            defaultValue={100}
            className="font-mono"
          />
          {betType !== 'yesno' && (
            <Field
              label="Exact-hit multiplier"
              name="exactMultiplier"
              type="number"
              inputMode="numeric"
              required
              min={1}
              max={10}
              defaultValue={2}
              className="font-mono"
            />
          )}
        </div>
      </details>
      {/* yesno boards don't render window/multiplier inputs — submit the
          defaults so the shared schema stays satisfied. */}
      {betType === 'yesno' && (
        <>
          <input type="hidden" name="windowSize" value={60} />
          <input type="hidden" name="exactMultiplier" value={1} />
        </>
      )}

      {state && 'error' in state && (
        <p className="text-sm font-medium text-danger">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create board'}
      </Button>
    </form>
  )
}
