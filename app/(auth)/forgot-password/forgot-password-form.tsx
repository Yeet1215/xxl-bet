'use client'

import { useActionState } from 'react'

import { requestPasswordReset, type RequestResetState } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<RequestResetState, FormData>(
    requestPasswordReset,
    undefined,
  )

  if (state && 'success' in state) {
    return (
      <div className="rounded-[12px] border border-border bg-surface-1 p-6 text-center flex flex-col gap-2">
        <p className="font-semibold">Check your inbox.</p>
        <p className="text-sm text-text-secondary">
          If that account exists and has an email, a reset link is on its way. It works once and
          expires in an hour.
        </p>
      </div>
    )
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-[12px] border border-border bg-surface-1 p-6"
    >
      <p className="text-sm text-text-secondary">
        Enter your username or email — we&apos;ll send a one-time reset link.
      </p>
      <Field
        label="Username or email"
        name="usernameOrEmail"
        required
        maxLength={254}
        autoComplete="username"
      />
      {state && 'error' in state && (
        <p className="text-sm font-medium text-danger">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  )
}
