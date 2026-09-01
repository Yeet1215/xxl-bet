'use client'

import { useActionState, useEffect, useRef } from 'react'

import { registerUser, type AuthActionState } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(
    registerUser,
    undefined,
  )
  const { showToast } = useToast()

  // handledStateRef guard (CLAUDE.md gotcha): never re-toast the same state.
  const handledStateRef = useRef<AuthActionState>(undefined)
  useEffect(() => {
    if (state && state !== handledStateRef.current && state.error) {
      handledStateRef.current = state
      showToast(state.error, 'error')
    }
  }, [state, showToast])

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-[12px] border border-border bg-surface-1 p-6"
    >
      <Field
        label="Username"
        name="username"
        autoComplete="username"
        required
        minLength={3}
        maxLength={20}
        pattern="[a-zA-Z0-9_\-]+"
        title="Letters, numbers, - and _ only"
      />
      <Field
        label="Display name"
        name="displayName"
        autoComplete="name"
        required
        maxLength={40}
        placeholder="How you show up on leaderboards"
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={100}
      />
      {state?.error && <p className="text-sm font-medium text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  )
}
