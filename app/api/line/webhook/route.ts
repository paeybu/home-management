import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appBaseUrl, buildDigest, loadDigestTasks } from "@/lib/digest";
import { lineReplyText, verifyLineSignature } from "@/lib/line";

/** Matches `/task` or `/tasks` on its own (case-insensitive), e.g. "/task", "/Tasks ". */
const TASK_COMMAND = /^\/tasks?$/i;

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { type: string; groupId?: string };
  message?: { type: string; text?: string };
};

/**
 * LINE Messaging API webhook. Replies with the task digest when someone types `/task`
 * in the configured family group. Every other event is ignored.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyLineSignature(rawBody, request.headers.get("x-line-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { events = [] } = JSON.parse(rawBody) as { events?: LineEvent[] };
  const groupId = process.env.LINE_GROUP_ID;

  for (const ev of events) {
    if (ev.type !== "message" || ev.message?.type !== "text" || !ev.replyToken) continue;
    if (!TASK_COMMAND.test(ev.message.text?.trim() ?? "")) continue;
    // Only answer in the family group, so the bot can't leak tasks to other chats it's added to.
    if (!groupId || ev.source?.groupId !== groupId) continue;

    try {
      const admin = createAdminClient();
      const { data: households, error } = await admin.from("households").select("id, name");
      if (error) throw new Error(error.message);

      const appUrl = appBaseUrl();
      const texts: string[] = [];
      for (const h of households ?? []) {
        const tasks = await loadDigestTasks(admin, h.id);
        texts.push(buildDigest(tasks, appUrl) ?? `🏠 Home tasks\n\n✅ Nothing overdue or due in the next 3 days.\n${appUrl}`);
      }
      await lineReplyText(ev.replyToken, texts.length ? texts : ["🏠 No household set up yet."]);
    } catch (e) {
      console.error("[line-webhook] /task failed:", e);
    }
  }

  // Always 200 for authenticated requests, otherwise LINE retries/flags the webhook.
  return NextResponse.json({ ok: true });
}
