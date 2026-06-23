import type { Todo } from "@/generated/prisma/client";
import { PRIORITIES, priorityColor } from "@/lib/todo";
import { WEEKDAYS } from "@/lib/timetable";

// Returns the human label for a priority value, falling back to the raw value.
function priorityLabel(priority: string): string {
  return PRIORITIES.find((p) => p.value === priority)?.label ?? priority;
}

// Builds the small grey meta line under a todo title: time block, priority and
// recurrence, joined by a middot. Empty pieces are dropped.
function metaLine(todo: Todo): string {
  const parts: string[] = [];
  if (todo.startTime) {
    parts.push(todo.endTime ? `${todo.startTime}-${todo.endTime}` : todo.startTime);
  }
  parts.push(priorityLabel(todo.priority));
  if (todo.isRecurring && todo.dayOfWeek !== null) {
    parts.push(`Repeats ${WEEKDAYS[todo.dayOfWeek]}`);
  }
  return parts.join(" &middot; ");
}

// Renders one todo as a table row with a priority dot, title and meta line.
function renderRow(todo: Todo): string {
  return `
    <tr>
      <td style="vertical-align:top;padding:8px 10px 8px 0;width:14px;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${priorityColor(
          todo.priority,
        )};"></span>
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #eceef2;">
        <div style="font-size:15px;color:#1b1f24;font-weight:600;">${escapeHtml(
          todo.title,
        )}</div>
        <div style="font-size:12px;color:#888f99;margin-top:2px;">${metaLine(todo)}</div>
      </td>
    </tr>`;
}

// Renders a titled section with its rows, or nothing when the list is empty.
function renderSection(title: string, todos: Todo[]): string {
  if (todos.length === 0) return "";
  const rows = todos.map(renderRow).join("");
  return `
    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#888f99;margin:24px 0 4px;">${title}</h2>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
      ${rows}
    </table>`;
}

// Escapes the few characters that would break HTML inside a text value.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Builds the daily digest email from the dashboard slices. Pure: no DB, no session.
// Groups Overdue first, then Today, with a friendly empty state when both are empty.
export function buildDigestEmail(
  name: string,
  today: Todo[],
  overdue: Todo[],
): { subject: string; html: string } {
  const total = today.length + overdue.length;
  const subject =
    overdue.length > 0
      ? `Your todos: ${overdue.length} overdue, ${today.length} today`
      : `Your todos for today: ${today.length}`;

  const body =
    total === 0
      ? `<p style="font-size:15px;color:#5b6068;">Nothing due today and nothing overdue. Enjoy the breathing room.</p>`
      : `${renderSection("Overdue", overdue)}${renderSection("Today", today)}`;

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
                <h1 style="font-size:20px;color:#1b1f24;margin:4px 0 0;">Morning, ${escapeHtml(
                  name,
                )}</h1>
                ${body}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html };
}
