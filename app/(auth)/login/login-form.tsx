'use client'

import { useActionState, useEffect, useRef } from 'react'

import { loginUser, type AuthActionState } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(
    loginUser,
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
      <Field label="Username" name="username" autoComplete="username" required maxLength={20} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        maxLength={100}
      />
      {state?.error && <p className="text-sm font-medium text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Logging in…' : 'Log in'}
      </Button>
    </form>
  )
}
