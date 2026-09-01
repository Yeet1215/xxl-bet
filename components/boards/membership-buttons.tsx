'use client'

import { useState, useTransition } from 'react'

import { kickMember, leaveBoard, regenerateInviteCode } from '@/lib/actions/boards'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

// Two-step confirm buttons (no modal system in this app — the second click IS
// the confirmation, and clicking anything else resets it).

export function LeaveBoardButton({ boardId }: { boardId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()
  const { showToast } = useToast()

  return (
    <Button
      variant="ghost"
      disabled={pending}
      onBlur={() => setConfirming(false)}
      onClick={() => {
        if (!confirming) {
          setConfirming(true)
          return
        }
        startTransition(async () => {
          const result = await leaveBoard(boardId)
          // Success redirects to '/'; only errors return.
          if (result?.error) showToast(result.error, 'error')
        })
      }}
      className={confirming ? 'text-danger' : 'text-text-muted'}
    >
      {pending ? 'Leaving…' : confirming ? 'Really leave? Your bets stay.' : 'Leave board'}
    </Button>
  )
}

export function KickMemberButton({
  boardId,
  userId,
  displayName,
}: {
  boardId: string
  userId: string
  displayName: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()
  const { showToast } = useToast()

  return (
    <Button
      variant="secondary"
      disabled={pending}
      onBlur={() => setConfirming(false)}
      onClick={() => {
        if (!confirming) {
          setConfirming(true)
          return
        }
        startTransition(async () => {
          const result = await kickMember(boardId, userId)
          if (result?.error) showToast(result.error, 'error')
          else showToast(`${displayName} removed`, 'success')
        })
      }}
      className={`min-h-[36px] px-3 text-xs ${confirming ? 'text-danger border-danger' : ''}`}
    >
      {pending ? 'Removing…' : confirming ? 'Confirm remove' : 'Remove'}
    </Button>
  )
}

export function RegenerateCodeButton({ boardId }: { boardId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()
  const { showToast } = useToast()

  return (
    <Button
      variant="secondary"
      disabled={pending}
      onBlur={() => setConfirming(false)}
      onClick={() => {
        if (!confirming) {
          setConfirming(true)
          return
        }
        setConfirming(false)
        startTransition(async () => {
          const result = await regenerateInviteCode(boardId)
          if (result?.error) showToast(result.error, 'error')
          else showToast('New invite code active — the old one is dead', 'success')
        })
      }}
      className="shrink-0"
    >
      {pending ? 'Rotating…' : confirming ? 'Old code stops working — sure?' : 'New code'}
    </Button>
  )
}
