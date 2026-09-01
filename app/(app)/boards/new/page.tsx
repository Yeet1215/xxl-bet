import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'
import { CreateBoardForm } from '@/components/boards/create-board-form'

export const metadata: Metadata = { title: 'New board — XXL Bet' }

export default async function NewBoardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">New Board</h1>
        <p className="text-sm text-text-secondary mt-1">
          One board = one running bet with its own leaderboard.
        </p>
      </div>
      <CreateBoardForm />
    </div>
  )
}
