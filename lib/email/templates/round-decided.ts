// Communal decided-round notification (BCC to all opted-in members — no
// per-recipient personalization possible, by design). Hardcoded hex is the
// sanctioned email exception; values mirror DESIGN.md.

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function roundDecidedEmailHtml({
  boardName,
  roundLabel,
  outcomeText,
  winnersText,
  boardLink,
}: {
  boardName: string
  roundLabel: string
  outcomeText: string
  winnersText: string
  boardLink: string
}): string {
  return `<!doctype html>
<html lang="en">
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f5f7fa;color:#18213b;padding:40px 20px;margin:0;">
    <div style="max-width:480px;margin:0 auto;padding:32px;background-color:#ffffff;border-radius:12px;border:1px solid #dde4ec;">
      <h1 style="font-size:22px;font-weight:800;margin:0 0 8px;color:#18213b;">Round decided</h1>
      <p style="font-size:14px;line-height:1.6;color:#5a6a85;margin:0 0 8px;">
        <strong style="color:#18213b;">${escapeHtml(boardName)}</strong> · ${escapeHtml(roundLabel)}
      </p>
      <p style="font-size:28px;font-weight:700;font-family:ui-monospace,'Cascadia Mono',Consolas,monospace;color:#0290e4;margin:0 0 12px;">
        ${escapeHtml(outcomeText)}
      </p>
      <p style="font-size:14px;line-height:1.6;color:#5a6a85;margin:0 0 16px;">
        ${escapeHtml(winnersText)}
      </p>
      <a href="${escapeHtml(boardLink)}" style="display:inline-block;padding:12px 24px;background-color:#0290e4;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">
        See the full results
      </a>
      <p style="font-size:12px;color:#8a97ab;margin-top:24px;border-top:1px solid #dde4ec;padding-top:16px;">
        You get this because you opted in — turn it off any time under
        Profile &rarr; Account &rarr; Profile &amp; email.
      </p>
    </div>
  </body>
</html>`
}
