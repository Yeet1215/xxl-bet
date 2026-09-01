'use client'

import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ui/button-link'

// Root error boundary — catches thrown server errors (including an expired
// session's UNAUTHENTICATED from a server action) with a way back instead of
// a dead end.
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  const unauthenticated = error.message === 'UNAUTHENTICATED'

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">
          {unauthenticated ? 'You got logged out.' : 'That one’s on us.'}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {unauthenticated
            ? 'Your session expired — log in again and pick up where you left off.'
            : 'Something went wrong on our side. Try again — it usually helps.'}
        </p>
      </div>
      <div className="flex gap-2">
        {unauthenticated ? (
          <ButtonLink href="/login">Log in</ButtonLink>
        ) : (
          <>
            <Button onClick={reset}>Try again</Button>
            <ButtonLink href="/" variant="secondary">
              Back to boards
            </ButtonLink>
          </>
        )}
      </div>
    </div>
  )
}
