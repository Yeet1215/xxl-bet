'use client'

import { useTransition } from 'react'

import { approveDecideRequest, denyDecideRequest } from '@/lib/actions/decide'
import type { BetType } from '@/lib/validators/boards'
import { formatBetValue } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

type PendingRequest = {
  id: string
  displayName: string
  proposedOutcomeValue: number
}

type DecideRequestsProps = {
  requests: PendingRequest[]
  betType: BetType
  unitLabel: string | null
}

// Owner-only review queue (the server re-checks ownership per request).
// Approving applies that proposal as the outcome; the round's other pending
// requests are auto-denied server-side.
export function DecideRequests({ requests, betType, unitLabel }: DecideRequestsProps) {
  const [pending, startTransition] = useTransition()
  const { showToast } = useToast()

  function review(requestId: string, verdict: 'approve' | 'deny') {
    startTransition(async () => {
      const result =
        verdict === 'approve'
          ? await approveDecideRequest(requestId)
          : await denyDecideRequest(requestId)
      if (result?.error) showToast(result.error, 'error')
      else
        showToast(
          verdict === 'approve' ? 'Approved — scores are in' : 'Request denied',
          'success',
        )
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-text-muted">
        Decide requests
      </h3>
      <ul className="flex flex-col divide-y divide-border rounded-[10px] border border-border bg-bg">
        {requests.map((request) => (
          <li key={request.id} className="flex items-center gap-3 px-3 py-2.5">
            <span className="flex-1 min-w-0 text-sm truncate">
              <span className="font-semibold">{request.displayName}</span>
              <span className="text-text-secondary"> proposes </span>
              <span className="font-mono font-semibold">
                {formatBetValue(request.proposedOutcomeValue, betType, unitLabel)}
              </span>
            </span>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => review(request.id, 'deny')}
              className="shrink-0 min-h-[36px] px-3 text-xs"
            >
              Deny
            </Button>
            <Button
              disabled={pending}
              onClick={() => review(request.id, 'approve')}
              className="shrink-0 min-h-[36px] px-3 text-xs"
            >
              Approve
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
