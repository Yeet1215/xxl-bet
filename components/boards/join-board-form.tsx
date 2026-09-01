'use client'

import { useActionState, useEffect, useRef } from 'react'

import { joinBoard, type BoardActionState } from '@/lib/actions/boards'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

export function JoinBoardForm() {
  const [state, action, pending] = useActionState<BoardActionState, FormData>(
    joinBoard,
    undefined,
  )
  const { showToast } = useToast()

  // handledStateRef guard (CLAUDE.md gotcha).
  const handledStateRef = useRef<BoardActionState>(undefined)
  useEffect(() => {
    if (state && state !== handledStateRef.current && 'error' in state) {
      handledStateRef.current = state
      showToast(state.error, 'error')
    }
  }, [state, showToast])

  return (
    <form action={action} className="flex gap-2">
      <input
        name="inviteCode"
        required
        minLength={4}
        maxLength={12}
        placeholder="Invite code"
        aria-label="Invite code"
        autoComplete="off"
        autoCapitalize="characters"
        className="flex-1 min-w-0 min-h-[44px] px-3 rounded-[10px] bg-bg border border-border text-text-primary placeholder:text-text-muted text-sm font-mono uppercase tracking-widest transition-colors focus:outline-none focus:border-accent"
      />
      <Button type="submit" variant="secondary" disabled={pending} className="shrink-0">
        {pending ? 'Joining…' : 'Join'}
      </Button>
    </form>
  )
}
