import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

export function lineConfigured() {
  return !!(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_GROUP_ID);
}

/** Push a text message to the configured LINE group via the Messaging API. */
export async function linePushText(text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_GROUP_ID;
  if (!token || !to) throw new Error("LINE_CHANNEL_ACCESS_TOKEN / LINE_GROUP_ID not set");
  const res = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to, messages: [{ type: "text", text: text.slice(0, 5000) }] }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LINE push failed (${res.status}): ${body}`);
  }
}

/** Verify the `x-line-signature` header: base64(HMAC-SHA256(channelSecret, rawBody)). */
export function verifyLineSignature(rawBody: string, signature: string | null) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Reply to a webhook event. Replies are free (don't count toward the monthly push quota). */
export async function lineReplyText(replyToken: string, texts: string[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN not set");
  const res = await fetch(LINE_REPLY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ replyToken, messages: texts.slice(0, 5).map((t) => ({ type: "text", text: t.slice(0, 5000) })) }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LINE reply failed (${res.status}): ${body}`);
  }
}
