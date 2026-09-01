import Link from 'next/link'
import type { Metadata } from 'next'

import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Log in — XXL Bet' }

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { reset } = await searchParams

  return (
    <div className="flex flex-col gap-4">
      {reset === '1' && (
        <p
          role="status"
          className="rounded-[10px] bg-success-soft text-success text-sm font-semibold px-4 py-3 text-center"
        >
          Password reset — log in with your new one.
        </p>
      )}
      <LoginForm />
      <p className="text-center text-sm text-text-secondary">
        New here?{' '}
        <Link href="/register" className="font-semibold text-accent hover:text-accent-deep">
          Create an account
        </Link>
      </p>
      <p className="text-center text-xs text-text-muted">
        <Link href="/forgot-password" className="hover:text-text-secondary">
          Forgot your password?
        </Link>
      </p>
    </div>
  )
}
