import { requireUser } from '@/lib/auth/session'

// Dashboard — chunk 2 fills this with the user's boards + create/join flows.
export default async function DashboardPage() {
  const user = await requireUser()

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
