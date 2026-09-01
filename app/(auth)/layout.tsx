import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'

export default async function AuthLayout({ children }: LayoutProps<'/'>) {
  // Already signed in → straight to the dashboard.
  const user = await getCurrentUser()
  if (user) redirect('/')

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <p className="text-2xl font-extrabold tracking-tight text-accent">XXL Bet</p>
          <p className="text-sm text-text-secondary mt-1">
            The office toto. Bet on the clock.
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
