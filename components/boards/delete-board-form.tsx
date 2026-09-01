'use client'

import { useActionState, useEffect, useRef, useState } from 'react'

import { deleteBoard, type BoardActionState } from '@/lib/actions/boards'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'

// Danger zone: delete is permanent (cascades all rounds/bets/history), so the
// confirmation is typing the exact board name. The client gate is UX only —
// the server re-verifies the name.
export function DeleteBoardForm({ boardId, boardName }: { boardId: string; boardName: string }) {
  const [state, action, pending] = useActionState<BoardActionState, FormData>(
    deleteBoard,
    undefined,
  )
  const { showToast } = useToast()
  const [confirmName, setConfirmName] = useState('')

  // handledStateRef guard (CLAUDE.md gotcha). Success redirects — only errors return.
  const handledStateRef = useRef<BoardActionState>(undefined)
  useEffect(() => {
    if (state && state !== handledStateRef.current && 'error' in state) {
      handledStateRef.current = state
      showToast(state.error, 'error')
    }
  }, [state, showToast])

  return (
    <details className="group rounded-[12px] border border-danger/40 bg-danger-soft/40">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-danger flex items-center gap-2">
        <span
          aria-hidden
          className="text-danger text-xs transition-transform duration-150 group-open:rotate-90"
        >
          ▶
        </span>
        Delete this board
      </summary>
      <form action={action} className="flex flex-col gap-3 px-4 pb-4">
        <p className="text-sm text-text-secondary">
          Permanent. Every round, bet, score and the hall of fame go with it — for all{' '}
          players. Type <span className="font-semibold text-text-primary">{boardName}</span> to
          confirm.
        </p>
        <input type="hidden" name="boardId" value={boardId} />
        <Field
          label="Board name"
          name="confirmName"
          required
          autoComplete="off"
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={boardName}
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={pending || confirmName.trim() !== boardName}
          className="text-danger border-danger/40 hover:bg-danger-soft"
        >
          {pending ? 'Deleting…' : 'Delete board forever'}
        </Button>
      </form>
    </details>
  )
}
