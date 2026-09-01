import 'server-only'

// Gmail SMTP via nodemailer (owner has no domain yet — Resend requires a
// verified one; Gmail sends real mail for free at office volume, ~500/day cap).
// Gmail rewrites the From ADDRESS to the authenticated account; only the
// display name ("XXL Bet") survives. If a domain ever lands, swapping back to
// an API sender means touching only this file — the interface stays.
//
// `skipped` = email disabled (env unset), nothing was sent. Callers that need
// delivery semantics must treat it as "not sent".
type EmailResult = { error?: string; skipped?: true }

export function isEmailEnabled(): boolean {
  return !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<EmailResult> {
  if (!isEmailEnabled()) {
    console.warn(
      `[email dev] To: ${to} | Subject: ${subject}\n` +
        `Set GMAIL_USER + GMAIL_APP_PASSWORD to send real emails.`,
    )
    return { skipped: true }
  }

  // Never throw: callers (registration, reset) must not fail because email
  // delivery hiccuped. Always resolve to { error? }.
  try {
    const { createTransport } = await import('nodemailer')
    const transport = createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER!,
        pass: process.env.GMAIL_APP_PASSWORD!,
      },
    })

    await transport.sendMail({
      from: `XXL Bet <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    })
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[sendEmail] send failed', { to, subject, message })
    return { error: message }
  }
}
