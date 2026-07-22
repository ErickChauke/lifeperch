import { titleCaseName } from "@/lib/utils";

// Escapes the few characters that would break HTML inside a text value.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Builds the folder password reset email. Pure: no DB, no session. Matches the
// digest email shell (centered 560px card, inline styles) with a single button.
export function buildPasswordResetEmail(
  name: string,
  folderTitle: string,
  resetLink: string,
): { subject: string; html: string } {
  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f6f8;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px 32px;">
            <tr>
              <td>
                <div style="font-size:13px;color:#888f99;">LifePerch</div>
                <h1 style="font-size:20px;color:#1b1f24;margin:4px 0 0;">Reset a folder password</h1>
                <p style="font-size:15px;color:#5b6068;margin:16px 0 0;">Hi ${escapeHtml(
                  titleCaseName(name) || "there",
                )}, you asked to reset the password on your vault folder
                  <strong>${escapeHtml(folderTitle)}</strong>. Open the link below to clear
                  it, then set a new password from the folder settings.</p>
                <p style="margin:24px 0;">
                  <a href="${escapeHtml(resetLink)}" style="display:inline-block;background:#1b1f24;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:11px 20px;border-radius:8px;">Reset folder password</a>
                </p>
                <p style="font-size:13px;color:#888f99;margin:0;">This link expires in 30 minutes. If you did not request it, you can ignore this email and the password stays unchanged.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: "Reset a vault folder password", html };
}
