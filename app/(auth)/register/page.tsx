import Link from 'next/link'
import type { Metadata } from 'next'

import { RegisterForm } from './register-form'

export const metadata: Metadata = { title: 'Register — XXL Bet' }

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-4">
      <RegisterForm />
      <p className="text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-accent hover:text-accent-deep">
          Log in
        </Link>
      </p>
    </div>
  )
}
