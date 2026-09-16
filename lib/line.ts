import "server-only";

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

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
