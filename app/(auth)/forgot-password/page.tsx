import type { Metadata } from 'next'
import Link from 'next/link'

import { ForgotPasswordForm } from './forgot-password-form'

export const metadata: Metadata = { title: 'Forgot password — XXL Bet' }

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-4">
      <ForgotPasswordForm />
      <p className="text-center text-sm text-text-secondary">
        Remembered after all?{' '}
        <Link href="/login" className="font-semibold text-accent hover:text-accent-deep">
          Log in
        </Link>
      </p>
    </div>
  )
}
