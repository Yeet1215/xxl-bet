'use client'

import { useEffect, useState } from 'react'

import { nowMinutesInTz } from '@/lib/utils/tz'

// "Next round in 5h 12m" — counts down to board-tz midnight, when the next
// day's round becomes bettable. Renders nothing until mounted (the value is
// clock-dependent, so SSR + hydration would mismatch by design).
export function NextRoundCountdown({ timezone }: { timezone: string }) {
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null)

  useEffect(() => {
    const update = () => setMinutesLeft(1440 - nowMinutesInTz(timezone))
    // Deferred first set (not synchronous-in-effect) per the lint rule.
    const first = setTimeout(update, 0)
    const interval = setInterval(update, 30_000)
    return () => {
      clearTimeout(first)
      clearInterval(interval)
    }
  }, [timezone])

  if (minutesLeft === null) return null

  const hours = Math.floor(minutesLeft / 60)
  const minutes = minutesLeft % 60

  return (
    <p className="text-xs text-text-muted text-center">
      Next round in{' '}
      <span className="font-mono font-semibold text-text-secondary">
        {hours > 0 ? `${hours}h ` : ''}
        {minutes}m
      </span>
    </p>
  )
}
