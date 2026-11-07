import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appBaseUrl, buildDigest, loadDigestTasks, loadFridgeItems } from "@/lib/digest";
import { fridgeInventoryText } from "@/lib/fridge";
import { todayISO } from "@/lib/format";
import { linePushText, lineReplyText, verifyLineSignature } from "@/lib/line";
import { getMenuSuggestions, menuLineText } from "@/lib/menu";

/** Matches `/task` or `/tasks` on its own (case-insensitive), e.g. "/task", "/Tasks ". */
const TASK_COMMAND = /^\/tasks?$/i;
/** Matches `/fridge` on its own (case-insensitive). */
const FRIDGE_COMMAND = /^\/fridge$/i;
/** Matches `/cook`, `/menu` or `/เมนู` on its own (case-insensitive). */
const COOK_COMMAND = /^\/(cook|menu|เมนู)$/i;

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { type: string; groupId?: string };
  message?: { type: string; text?: string };
};

/**
 * LINE Messaging API webhook, for the configured family group only:
 * `/task` replies with every active task, `/fridge` with the fridge/freezer inventory,
 * `/cook` with Thai dish suggestions from the fridge (read-only).
 * Every other event is ignored.
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
    const text = ev.message.text?.trim() ?? "";
    const command = TASK_COMMAND.test(text) ? "task" : FRIDGE_COMMAND.test(text) ? "fridge" : COOK_COMMAND.test(text) ? "cook" : null;
    if (!command) continue;
    // Only answer in the family group, so the bot can't leak tasks to other chats it's added to.
    if (!groupId || ev.source?.groupId !== groupId) continue;

    if (command === "cook") {
      // The model can take tens of seconds: acknowledge the webhook now and reply once it's done.
      const replyToken = ev.replyToken;
      after(() => replyWithMenu(replyToken));
      continue;
    }

    try {
      const admin = createAdminClient();
      const { data: households, error } = await admin.from("households").select("id, name");
      if (error) throw new Error(error.message);

      const appUrl = appBaseUrl();
      const texts: string[] = [];
      for (const h of households ?? []) {
        if (command === "fridge") {
          texts.push(fridgeInventoryText(await loadFridgeItems(admin, h.id), todayISO(), appUrl));
        } else {
          const tasks = await loadDigestTasks(admin, h.id, null);
          texts.push(buildDigest(tasks, appUrl) ?? `🏠 Home tasks\n\n✅ No active tasks.\n${appUrl}`);
        }
      }
      await lineReplyText(ev.replyToken, texts.length ? texts : ["🏠 No household set up yet."]);
    } catch (e) {
      console.error(`[line-webhook] /${command} failed:`, e);
    }
  }

  // Always 200 for authenticated requests, otherwise LINE retries/flags the webhook.
  return NextResponse.json({ ok: true });
}

async function replyWithMenu(replyToken: string) {
  let texts: string[];
  try {
    const admin = createAdminClient();
    const { data: households, error } = await admin.from("households").select("id");
    if (error) throw new Error(error.message);
    const appUrl = appBaseUrl();
    texts = [];
    for (const h of households ?? []) texts.push(menuLineText(await getMenuSuggestions(admin, h.id, todayISO()), appUrl));
    if (!texts.length) texts = ["🏠 No household set up yet."];
  } catch (e) {
    console.error("[line-webhook] /cook failed:", e);
    texts = ["🍳 ขอโทษ คิดเมนูไม่สำเร็จ ลองใหม่อีกครั้งนะ"];
  }
  try {
    await lineReplyText(replyToken, texts);
  } catch (e) {
    // Reply tokens expire after a short while; fall back to a push message if generation was slow.
    console.warn("[line-webhook] /cook reply failed, pushing instead:", e);
    for (const t of texts) await linePushText(t).catch((err) => console.error("[line-webhook] /cook push failed:", err));
  }
}
