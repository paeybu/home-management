import "server-only";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { foodEmoji } from "@/lib/food-emoji";
import { expiryStatus, formatQuantity, sortByExpiry } from "@/lib/fridge";
import type { FridgeItem } from "@/lib/types";

/** Read-only menu suggestions from the fridge. Nothing here writes to fridge_items. */

export const MENU_MODEL = "claude-sonnet-5-5";
/** Bump when the prompt or schema changes so cached suggestions are regenerated. */
const PROMPT_VERSION = "2";

/** Assumed to be in the kitchen already, so never listed as missing. */
const PANTRY_STAPLES = ["ข้าวสวย", "น้ำปลา", "ซีอิ๊ว", "ซอสหอยนางรม", "น้ำตาล", "เกลือ", "พริกไทย", "น้ำมันพืช", "กระเทียม", "หอมแดง", "พริก"];

export const CUISINES = [
  { value: "thai", label: "Thai", th: "ไทย" },
  { value: "japanese", label: "Japanese", th: "ญี่ปุ่น" },
  { value: "chinese", label: "Chinese", th: "จีน" },
  { value: "korean", label: "Korean", th: "เกาหลี" },
  { value: "vietnamese", label: "Vietnamese", th: "เวียดนาม" },
  { value: "indian", label: "Indian", th: "อินเดีย" },
  { value: "italian", label: "Italian", th: "อิตาเลียน" },
  { value: "western", label: "Western", th: "ตะวันตก" },
] as const;
export type Cuisine = (typeof CUISINES)[number]["value"];
const CUISINE_VALUES = CUISINES.map((c) => c.value) as [Cuisine, ...Cuisine[]];

export type MenuFilters = { mainIds: string[]; cuisines: Cuisine[] };

/** Parse `?main=<id>&cuisine=<value>` (each repeatable) into filters; unknown values are dropped. */
export function parseMenuFilters(main: unknown, cuisine: unknown): MenuFilters {
  const list = (v: unknown) => (Array.isArray(v) ? v : v == null ? [] : [v]).filter((x): x is string => typeof x === "string" && x !== "");
  return {
    mainIds: [...new Set(list(main))],
    cuisines: [...new Set(list(cuisine))].filter((c): c is Cuisine => (CUISINE_VALUES as string[]).includes(c)),
  };
}

const DishSchema = z.object({
  name: z.string().describe("Dish name in Thai"),
  cuisine: z.enum(CUISINE_VALUES),
  description: z.string().describe("One short sentence in Thai"),
  time_minutes: z.number().int().describe("Total cooking time in minutes"),
  servings: z.number().int(),
  uses: z
    .array(z.object({ item: z.number().int().describe("Inventory item number from the list"), amount: z.string().describe("Amount used, in Thai, e.g. '200 กรัม' or '2 ฟอง'") }))
    .describe("Fridge/freezer items this dish uses"),
  missing: z
    .array(z.object({ name: z.string().describe("Ingredient name in Thai"), optional: z.boolean() }))
    .describe("Ingredients not in the inventory and not pantry staples"),
  steps: z.array(z.string()).describe("Cooking steps in Thai, one per entry, without numbering"),
});
const MenuSchema = z.object({ dishes: z.array(DishSchema) });
type RawDish = z.infer<typeof DishSchema>;

export type MenuIngredient = { name: string; emoji: string; amount: string; expiring: boolean };
export type MenuDish = Omit<RawDish, "uses"> & { uses: MenuIngredient[] };
export type MenuSuggestions = { dishes: MenuDish[]; createdAt: string; model: string };

export type InventoryItem = Pick<FridgeItem, "id" | "name" | "location" | "quantity" | "unit" | "expires_on" | "opened_on"> & {
  food_catalog: { emoji: string | null } | null;
};

export async function loadInventory(client: SupabaseClient, householdId: string) {
  const { data, error } = await client
    .from("fridge_items")
    .select("id, name, location, quantity, unit, expires_on, opened_on, food_catalog(emoji)")
    .eq("household_id", householdId)
    .is("removed_at", null)
    .returns<InventoryItem[]>();
  if (error) throw new Error(`Couldn't load fridge items: ${error.message}`);
  return sortByExpiry(data ?? []);
}

function inventoryHash(items: InventoryItem[], filters: MenuFilters) {
  const key = items
    .map((i) => [i.name.trim().toLowerCase(), i.location, Number(i.quantity), i.unit, i.expires_on ?? "", i.opened_on ?? ""].join("|"))
    .sort()
    .join("\n");
  const main = items.filter((i) => filters.mainIds.includes(i.id)).map((i) => i.id).sort().join(",");
  const cuisines = [...filters.cuisines].sort().join(",");
  return createHash("sha256").update(`${PROMPT_VERSION}\nmain:${main}\ncuisine:${cuisines}\n${key}`).digest("hex");
}

function inventoryPrompt(items: InventoryItem[], today: string, filters: MenuFilters) {
  const lines = items.map((i, n) => {
    const { status, days } = expiryStatus(i.expires_on, today);
    const expiry =
      status === "no_expiry" ? "no expiry date" : status === "expired" ? `EXPIRED ${-days!} day(s) ago` : `expires in ${days} day(s)`;
    const flags = [i.location, expiry, i.opened_on ? "opened" : null].filter(Boolean).join(", ");
    return `${n + 1}. ${i.name} — ${formatQuantity(i.quantity, i.unit)} (${flags})`;
  });
  const parts = [`Today is ${today}. Our fridge and freezer contain:\n\n${lines.join("\n")}`];
  const main = items.flatMap((i, n) => (filters.mainIds.includes(i.id) ? [`${n + 1}. ${i.name}`] : []));
  if (main.length) parts.push(`Main ingredients we want to cook with:\n${main.join("\n")}`);
  if (filters.cuisines.length) {
    parts.push(`Cuisines we want: ${filters.cuisines.map((c) => CUISINES.find((x) => x.value === c)!.label).join(", ")}`);
  }
  return parts.join("\n\n");
}

const SYSTEM_PROMPT = `You suggest home-cooked dishes for a Thai household based on what is in their fridge and freezer.

Suggest 5 dishes, best first. Rank by:
1. Uses items that expire soonest (within 2 days) — the main goal is to avoid food waste.
2. Needs few or no missing ingredients.
3. Practical for an everyday home kitchen.

Rules:
- Write every dish name, description, amount, missing ingredient and step in Thai.
- If main ingredients are given, every dish must be built around at least one of them, and together the dishes should cover all of them. Combine several in one dish when they go well together. Other items are supporting ingredients.
- If cuisines are given, every dish must be one of those cuisines; spread the dishes across them. Otherwise mostly Thai home cooking, with other cuisines when they fit the ingredients better.
- Set "cuisine" to the dish's cuisine.
- Only reference inventory items by their number. Don't use more than the quantity available.
- Skip items marked EXPIRED unless they are frozen or clearly still safe (e.g. hard cheese); never build a dish around expired fresh meat, seafood or dairy.
- Frozen items need thawing; mention it in the first step.
- Assume these pantry staples are available and never list them as missing: ${PANTRY_STAPLES.join(", ")}.
- Keep steps short and concrete (5–8 steps).`;

/** `?main=…&cuisine=…` query string (with leading `?`, or "" when no filters). */
export function menuFiltersQuery(filters: MenuFilters) {
  const q = new URLSearchParams();
  filters.mainIds.forEach((id) => q.append("main", id));
  filters.cuisines.forEach((c) => q.append("cuisine", c));
  const str = q.toString();
  return str ? `?${str}` : "";
}

/** Saved suggestions for the current inventory + filters, without calling the model. Null when none are saved. */
export async function getCachedMenu(client: SupabaseClient, householdId: string, filters: MenuFilters, items: InventoryItem[]) {
  const { data: cached, error } = await client
    .from("menu_suggestions")
    .select("dishes, model, created_at")
    .eq("household_id", householdId)
    .eq("inventory_hash", inventoryHash(items, filters))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load menu suggestions: ${error.message}`);
  return cached ? ({ dishes: cached.dishes as MenuDish[], model: cached.model, createdAt: cached.created_at } satisfies MenuSuggestions) : null;
}

/**
 * Menu suggestions for the household's current inventory. Returns the cached result when the
 * inventory hasn't changed since the last call, unless `force` is set. Returns null when the fridge is empty.
 */
export async function getMenuSuggestions(
  client: SupabaseClient,
  householdId: string,
  today: string,
  { force = false, filters = { mainIds: [], cuisines: [] }, items }: { force?: boolean; filters?: MenuFilters; items?: InventoryItem[] } = {},
): Promise<MenuSuggestions | null> {
  items ??= await loadInventory(client, householdId);
  if (!items.length) return null;
  const hash = inventoryHash(items, filters);

  if (!force) {
    const cached = await getCachedMenu(client, householdId, filters, items);
    if (cached) return cached;
  }

  const raw = await generateDishes(items, today, filters);
  const dishes = raw.map((d) => resolveDish(d, items, today));

  const { data: saved, error } = await client
    .from("menu_suggestions")
    .insert({ household_id: householdId, inventory_hash: hash, dishes, model: MENU_MODEL })
    .select("created_at")
    .single();
  if (error) console.error("[menu] couldn't cache suggestions:", error.message);
  return { dishes, model: MENU_MODEL, createdAt: saved?.created_at ?? new Date().toISOString() };
}

async function generateDishes(items: InventoryItem[], today: string, filters: MenuFilters): Promise<RawDish[]> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  const anthropic = new Anthropic();
  const response = await anthropic.beta.messages.parse({
    model: MENU_MODEL,
    max_tokens: 16000,
    // Retries on another model if a safety classifier declines (unlikely for recipes).
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: zodOutputFormat(MenuSchema) },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: inventoryPrompt(items, today, filters) }],
  });

  if (response.stop_reason === "refusal") throw new Error("The model declined to suggest dishes. Try again.");
  if (response.stop_reason === "max_tokens") throw new Error("The suggestion was cut off. Try again.");
  if (!response.parsed_output) throw new Error("Couldn't read the model's suggestions. Try again.");
  return response.parsed_output.dishes;
}

/** Map item numbers back to the fridge items; drop references to numbers that don't exist. */
function resolveDish(d: RawDish, items: InventoryItem[], today: string): MenuDish {
  const uses = d.uses.flatMap(({ item, amount }) => {
    const i = items[item - 1];
    if (!i) return [];
    const { status } = expiryStatus(i.expires_on, today);
    return [{ name: i.name, emoji: i.food_catalog?.emoji ?? foodEmoji(i.name, i.unit, i.location), amount, expiring: status === "expired" || status === "expiring_soon" }];
  });
  return { ...d, uses };
}

/** Short Thai text for the LINE `/cook` command: top 3 dishes + link. */
export function menuLineText(menu: MenuSuggestions | null, appUrl: string) {
  const link = appUrl ? `\n\nดูวิธีทำทั้งหมด: ${appUrl}/fridge/cook` : "";
  if (!menu?.dishes.length) return `🍳 ตู้เย็นว่าง ยังไม่มีของให้แนะนำเมนู${link}`;
  const parts = ["🍳 เมนูจากของในตู้เย็น"];
  menu.dishes.slice(0, 3).forEach((d, n) => {
    parts.push("", `${n + 1}. ${d.name} (${d.time_minutes} นาที)`);
    if (d.uses.length) parts.push(`   ใช้: ${d.uses.map((u) => `${u.name}${u.expiring ? " ⏰" : ""}`).join(", ")}`);
    const missing = d.missing.filter((m) => !m.optional);
    if (missing.length) parts.push(`   ต้องซื้อ: ${missing.map((m) => m.name).join(", ")}`);
  });
  return parts.join("\n") + link;
}
