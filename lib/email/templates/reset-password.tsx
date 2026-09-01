// Email templates hardcode hex (email clients can't read CSS vars) — the one
// sanctioned exception to the tokens rule; values mirror DESIGN.md.
type ResetPasswordEmailProps = {
  username: string
  resetLink: string
}

const main = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  backgroundColor: '#f5f7fa',
  color: '#18213b',
  padding: '40px 20px',
}

const container = {
  maxWidth: '480px',
  margin: '0 auto',
  padding: '32px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #dde4ec',
}

const heading = {
  fontSize: '22px',
  fontWeight: '800',
  margin: '0 0 8px',
  color: '#18213b',
}

const text = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#5a6a85',
  margin: '0 0 16px',
}

const button = {
  display: 'inline-block',
  padding: '12px 24px',
  backgroundColor: '#0290e4',
  color: '#ffffff',
  textDecoration: 'none',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: '700',
}

const footer = {
  fontSize: '12px',
  color: '#8a97ab',
  marginTop: '24px',
  borderTop: '1px solid #dde4ec',
  paddingTop: '16px',
}

export function ResetPasswordEmail({ username, resetLink }: ResetPasswordEmailProps) {
  return (
    <html lang="en">
      <body style={main}>
        <div style={container}>
          <h1 style={heading}>Reset your password</h1>
          <p style={text}>
            Hi {username} — someone (hopefully you) asked to reset your XXL Bet password. The
            link below works once and expires in 1 hour.
          </p>
          <a href={resetLink} style={button}>
            Choose a new password
          </a>
          <p style={footer}>
            Didn&apos;t ask for this? Ignore it — your password stays as it is. Nobody can reset
            it without this link.
          </p>
        </div>
      </body>
    </html>
  )
}
