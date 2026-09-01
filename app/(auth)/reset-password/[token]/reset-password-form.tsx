'use client'

import { useActionState } from 'react'

import { resetPassword, type AuthActionState } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(
    resetPassword,
    undefined,
  )

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-[12px] border border-border bg-surface-1 p-6"
    >
      <p className="text-sm text-text-secondary">
        Choose a new password. This logs you out everywhere.
      </p>
      <input type="hidden" name="token" value={token} />
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={100}
      />
      {state?.error && <p className="text-sm font-medium text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Set new password'}
      </Button>
    </form>
  )
}
