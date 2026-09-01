'use client'

import { useEffect, useState } from 'react'

// The ONE allowed piece of flash (DESIGN.md: "must be earned: diff === 0").
// Fires when a decided round contains an exact hit — once per round per
// browser (sessionStorage guard), deterministic positions, ~2s, inert.
const PIECE_COUNT = 24
const COLORS = ['var(--color-accent)', 'var(--color-success)', 'var(--color-accent-deep)']

export function ExactConfetti({ roundKey }: { roundKey: string }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      const key = `confetti:${roundKey}`
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      // Storage unavailable (private mode etc.) — celebrate anyway.
    }
    // Deferred setState (not synchronous-in-effect) — same pattern as the
    // board replay effect; keeps the react-hooks/set-state-in-effect rule happy.
    queueMicrotask(() => setShow(true))
    const timeout = setTimeout(() => setShow(false), 2400)
    return () => clearTimeout(timeout)
  }, [roundKey])

  if (!show) return null

  const pieces = Array.from({ length: PIECE_COUNT }, (_, i) => ({
    left: (i * 41 + 13) % 100,
    delay: (i % 6) * 110,
    duration: 1500 + (i % 5) * 220,
    color: COLORS[i % COLORS.length],
    size: i % 3 === 0 ? 10 : 7,
  }))

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((piece, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size + 4,
            background: piece.color,
            animationDelay: `${piece.delay}ms`,
            animationDuration: `${piece.duration}ms`,
          }}
        />
      ))}
    </div>
  )
}
