'use client'

import { useActionState, useEffect, useRef } from 'react'

import {
  changePassword,
  updateProfile,
  type AccountActionState,
} from '@/lib/actions/account'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'

const panelClass = 'group rounded-[12px] border border-border bg-surface-1'
const summaryClass =
  'cursor-pointer list-none px-4 py-3 text-sm font-semibold text-text-secondary flex items-center gap-2'

function Chevron() {
  return (
    <span
      aria-hidden
      className="text-text-muted text-xs transition-transform duration-150 group-open:rotate-90"
    >
      ▶
    </span>
  )
}

export function AccountSettings({
  displayName,
  email,
  notifyOnDecide,
}: {
  displayName: string
  email: string | null
  notifyOnDecide: boolean
}) {
  const { showToast } = useToast()

  const [profileState, profileAction, profilePending] = useActionState<
    AccountActionState,
    FormData
  >(updateProfile, undefined)
  const [passwordState, passwordAction, passwordPending] = useActionState<
    AccountActionState,
    FormData
  >(changePassword, undefined)

  // handledStateRef guards (CLAUDE.md gotcha) — toast BOTH outcomes.
  const handledProfileRef = useRef<AccountActionState>(undefined)
  useEffect(() => {
    if (profileState && profileState !== handledProfileRef.current) {
      handledProfileRef.current = profileState
      if ('error' in profileState) showToast(profileState.error, 'error')
      else if (profileState.ok) showToast('Profile saved', 'success')
    }
  }, [profileState, showToast])

  const passwordFormRef = useRef<HTMLFormElement>(null)
  const handledPasswordRef = useRef<AccountActionState>(undefined)
  useEffect(() => {
    if (passwordState && passwordState !== handledPasswordRef.current) {
      handledPasswordRef.current = passwordState
      if ('error' in passwordState) showToast(passwordState.error, 'error')
      else if (passwordState.ok) {
        showToast('Password changed — other devices are logged out', 'success')
        passwordFormRef.current?.reset()
      }
    }
  }, [passwordState, showToast])

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-text-muted">Account</h2>

      <details className={panelClass}>
        <summary className={summaryClass}>
          <Chevron />
          Profile &amp; email
        </summary>
        <form action={profileAction} className="flex flex-col gap-4 px-4 pb-4">
          <Field
            label="Display name"
            name="displayName"
            required
            maxLength={40}
            defaultValue={displayName}
          />
          <Field
            label="Email"
            name="email"
            type="email"
            maxLength={254}
            defaultValue={email ?? ''}
            placeholder="Used only for password resets"
          />
          <p className="text-xs text-text-muted -mt-2">
            No email = no password reset. Your call.
          </p>
          {/* Native checkbox (iOS gotcha: never a styled button-switch). */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="notifyOnDecide"
              defaultChecked={notifyOnDecide}
              className="mt-0.5 w-4 h-4 shrink-0 accent-accent"
            />
            <span className="text-sm">
              <span className="font-semibold text-text-primary">
                Email me when a round is decided
              </span>
              <span className="block text-xs text-text-muted">
                Outcome + winners, one mail per round. Needs an email above.
              </span>
            </span>
          </label>
          <Button type="submit" disabled={profilePending}>
            {profilePending ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </details>

      <details className={panelClass}>
        <summary className={summaryClass}>
          <Chevron />
          Change password
        </summary>
        <form ref={passwordFormRef} action={passwordAction} className="flex flex-col gap-4 px-4 pb-4">
          <Field
            label="Current password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            maxLength={100}
          />
          <Field
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={100}
          />
          <p className="text-xs text-text-muted -mt-2">
            Changing it logs out every other device.
          </p>
          <Button type="submit" disabled={passwordPending}>
            {passwordPending ? 'Saving…' : 'Change password'}
          </Button>
        </form>
      </details>
    </section>
  )
}
