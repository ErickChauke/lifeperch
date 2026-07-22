import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTodayTodosForUser } from "@/actions/todo";
import { buildDigestEmail } from "@/lib/digest";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Send even when there is nothing due. Flip to true for a daily nudge instead.
const SEND_WHEN_EMPTY = false;

// Sends the daily todo digest to every opted-in user. Triggered by Vercel Cron,
// which carries no session, so it reads by explicit user id and guards with a
// shared secret rather than auth().
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  // Reject unless the Bearer secret matches. A missing secret allows manual dev runs.
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const users = await prisma.user.findMany({
    where: { email: { not: null }, dailyDigest: true },
    select: { id: true, name: true, email: true },
  });

  let sent = 0;
  let skipped = 0;
  for (const user of users) {
    try {
      const { today, overdue } = await getTodayTodosForUser(user.id);
      if (!SEND_WHEN_EMPTY && today.length === 0 && overdue.length === 0) {
        skipped++;
        continue;
      }
      const { subject, html } = buildDigestEmail(
        user.name ?? "",
        today,
        overdue,
      );
      await sendEmail({ to: user.email!, subject, html });
      sent++;
    } catch (err) {
      console.error(`digest failed for ${user.id}`, err);
      skipped++;
    }
  }

  return NextResponse.json({ sent, skipped });
}
