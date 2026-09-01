import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'
import { Header } from '@/components/app/header'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col min-h-dvh">
      <Header user={user} />
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 sm:px-6 py-6">{children}</main>
    </div>
  )
}
