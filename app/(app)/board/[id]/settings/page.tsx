import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'
import { getBoardForUser } from '@/lib/queries/boards'
import { BET_TYPE_META } from '@/lib/constants/bet-types'
import { Stamp } from '@/components/ui/stamp'
import { BoardSettingsForm } from '@/components/boards/board-settings-form'

export const metadata: Metadata = { title: 'Board settings — XXL Bet' }

export default async function BoardSettingsPage({
  params,
}: PageProps<'/board/[id]/settings'>) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params
  const row = await getBoardForUser(id, user.id)
  if (!row || !row.membership) notFound()
  // Members can see the board; only the owner belongs here.
  if (row.board.ownerId !== user.id) redirect(`/board/${id}`)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Board Settings</h1>
        <div className="flex items-center gap-2 mt-2">
          <Stamp>{BET_TYPE_META[row.board.betType].label}</Stamp>
          <span className="text-xs text-text-muted">
            Bet type is fixed — old bets would stop making sense.
          </span>
        </div>
      </div>
      <BoardSettingsForm board={row.board} />
    </div>
  )
}
