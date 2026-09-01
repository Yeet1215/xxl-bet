'use client'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

export function InviteCode({ code }: { code: string }) {
  const { showToast } = useToast()

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      showToast('Invite code copied', 'success')
    } catch {
      showToast('Could not copy — select it manually', 'error')
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-[12px] border border-border bg-surface-1 p-3">
      <span className="flex-1 text-center font-mono text-lg font-semibold tracking-[0.3em] select-all">
        {code}
      </span>
      <Button variant="secondary" onClick={copy} className="shrink-0">
        Copy
      </Button>
    </div>
  )
}
