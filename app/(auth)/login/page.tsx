import Link from 'next/link'
import type { Metadata } from 'next'

import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Log in — XXL Bet' }

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-4">
      <LoginForm />
      <p className="text-center text-sm text-text-secondary">
        New here?{' '}
        <Link href="/register" className="font-semibold text-accent hover:text-accent-deep">
          Create an account
        </Link>
      </p>
    </div>
  )
}
