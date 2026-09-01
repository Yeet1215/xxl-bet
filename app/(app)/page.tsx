import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'

// Dashboard — chunk 2 fills this with the user's boards + create/join flows.
export default async function DashboardPage() {
  // Pages guard with getCurrentUser + redirect, NOT requireUser — layout and
  // page render in parallel, so a throwing guard here logs a noisy (harmless)
  // UNAUTHENTICATED error while the layout's redirect wins. CLAUDE.md gotcha.
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">
        Hey, {user.displayName}
      </h1>
      <div className="rounded-[12px] border border-border bg-surface-1 p-8 text-center flex flex-col items-center gap-2">
        <p className="font-semibold">No boards yet.</p>
        <p className="text-sm text-text-secondary">
          Boards are where the bets happen — creating and joining them lands in
          the next chunk.
        </p>
      </div>
    </div>
  )
}
