'use client'

import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ui/button-link'

// Root error boundary. NOTE: server-action error messages are REDACTED in
// production (generic message + digest), so we can't branch on
// error.message === 'UNAUTHENTICATED' — instead the expired-session case is
// covered by always offering a login path alongside retry (review finding #3).
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">That one’s on us.</h1>
        <p className="text-sm text-text-secondary mt-1">
          Something went wrong. Try again — or if you&apos;ve been idle a long while, your
          session may have expired.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Back to boards
        </ButtonLink>
        <ButtonLink href="/login" variant="secondary">
          Log in again
        </ButtonLink>
      </div>
    </div>
  )
}
