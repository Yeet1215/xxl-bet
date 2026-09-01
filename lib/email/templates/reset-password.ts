// Plain HTML-string template (not React: react-dom/server isn't allowed in
// server-action context, and nodemailer wants a string anyway). Hardcoded hex
// is the sanctioned email exception — values mirror DESIGN.md. User-provided
// values are escaped before interpolation.

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function resetPasswordEmailHtml({
  username,
  resetLink,
}: {
  username: string
  resetLink: string
}): string {
  return `<!doctype html>
<html lang="en">
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f5f7fa;color:#18213b;padding:40px 20px;margin:0;">
    <div style="max-width:480px;margin:0 auto;padding:32px;background-color:#ffffff;border-radius:12px;border:1px solid #dde4ec;">
      <h1 style="font-size:22px;font-weight:800;margin:0 0 8px;color:#18213b;">Reset your password</h1>
      <p style="font-size:14px;line-height:1.6;color:#5a6a85;margin:0 0 16px;">
        Hi ${escapeHtml(username)} — someone (hopefully you) asked to reset your XXL Bet
        password. The link below works once and expires in 1 hour.
      </p>
      <a href="${escapeHtml(resetLink)}" style="display:inline-block;padding:12px 24px;background-color:#0290e4;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">
        Choose a new password
      </a>
      <p style="font-size:12px;color:#8a97ab;margin-top:24px;border-top:1px solid #dde4ec;padding-top:16px;">
        Didn&#39;t ask for this? Ignore it — your password stays as it is. Nobody can
        reset it without this link.
      </p>
    </div>
  </body>
</html>`
}
