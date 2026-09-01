'use client'

import { useState } from 'react'

import type { BetType } from '@/lib/validators/boards'
import { formatMinutes } from '@/lib/utils/tz'

type ValueInputProps = {
  name: string
  betType: BetType
  unitLabel: string | null
  defaultValue: number | null
  ariaLabel: string
}

const inputClass =
  'min-h-[44px] px-3 rounded-[10px] bg-bg border border-border text-text-primary ' +
  'placeholder:text-text-muted text-sm font-mono transition-colors ' +
  'focus:outline-none focus:border-accent'

// The one typed value input — bets, outcomes, and proposed outcomes all use
// it (BetForm / DecideForm / RequestDecideForm). Submits through `name`; the
// server re-validates against the board's own betType regardless.
export function ValueInput({ name, betType, unitLabel, defaultValue, ariaLabel }: ValueInputProps) {
  // yesno: state-driven buttons + hidden input (iOS-safe pattern). The hidden
  // input only exists once picked — the server rejects a missing pick.
  const [yesno, setYesno] = useState<'1' | '0' | null>(
    defaultValue === null ? null : defaultValue === 1 ? '1' : '0',
  )

  if (betType === 'time') {
    return (
      <input
        name={name}
        type="time"
        required
        defaultValue={defaultValue !== null ? formatMinutes(defaultValue) : ''}
        aria-label={ariaLabel}
        className={`flex-1 min-w-0 ${inputClass}`}
      />
    )
  }

  if (betType === 'number') {
    return (
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <input
          name={name}
          type="number"
          inputMode="numeric"
          required
          min={-100000000}
          max={100000000}
          defaultValue={defaultValue ?? ''}
          placeholder="0"
          aria-label={`${ariaLabel}${unitLabel ? ` (${unitLabel})` : ''}`}
          className={`flex-1 min-w-0 ${inputClass}`}
        />
        {unitLabel && <span className="text-sm text-text-secondary shrink-0">{unitLabel}</span>}
      </div>
    )
  }

  return (
    <div
      className="flex-1 flex gap-2"
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        // Radio keyboard semantics: arrows move selection AND focus (the
        // unselected button is tabIndex=-1, unreachable without this).
        if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return
        e.preventDefault()
        const next = (yesno ?? '1') === '1' ? '0' : '1'
        setYesno(next)
        e.currentTarget
          .querySelectorAll<HTMLButtonElement>('[role="radio"]')
          [next === '1' ? 0 : 1]?.focus()
      }}
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
      {yesno !== null && <input type="hidden" name={name} value={yesno} />}
    </div>
  )
}
