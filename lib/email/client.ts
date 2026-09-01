import 'server-only'
import type { ReactElement } from 'react'

// Ported from fitapp (incl. its post-25 fix): `skipped` = email disabled
// (no RESEND_API_KEY), nothing was sent. Callers that need delivery
// semantics must treat it as "not sent"; fire-and-forget callers may ignore.
type EmailResult = { error?: string; skipped?: true }

// MUST be a Resend-verified sender in prod; the sandbox fallback only
// delivers to the Resend account owner (so misconfig isn't silent).
const FROM = process.env.EMAIL_FROM ?? 'XXL Bet <onboarding@resend.dev>'

export function isEmailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY
}

export async function sendEmail(
  to: string,
  subject: string,
  react: ReactElement,
): Promise<EmailResult> {
  if (!isEmailEnabled()) {
    console.warn(
      `[email dev] To: ${to} | Subject: ${subject}\n` +
        `Set RESEND_API_KEY to send real emails.`,
    )
    return { skipped: true }
  }

  // Never throw: callers (registration, reset) must not fail because email
  // delivery hiccuped. Always resolve to { error? }.
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY!)

    const { error } = await resend.emails.send({ from: FROM, to: [to], subject, react })

    if (error) return { error: error.message }
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[sendEmail] send failed', { to, subject, message })
    return { error: message }
  }
}
