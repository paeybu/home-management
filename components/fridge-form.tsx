"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/submit-button";
import { FRIDGE_LOCATIONS, FRIDGE_UNITS } from "@/lib/fridge";
import { foodEmoji } from "@/lib/food-emoji";
import { FOOD_MODELS, foodModel, modelLabel } from "@/lib/food-models";
import type { FridgeFormState } from "@/app/(app)/fridge/actions";
import type { FoodCatalogEntry, FridgeItem, FridgeLocation, FridgeUnit } from "@/lib/types";
import { cn } from "@/lib/utils";

export type CatalogSuggestion = Pick<FoodCatalogEntry, "id" | "name" | "emoji" | "model" | "default_unit" | "default_location" | "shelf_life_days" | "use_count">;

type Props = {
  action: (prev: FridgeFormState, fd: FormData) => Promise<FridgeFormState>;
  item?: FridgeItem;
  /** The household's food catalog, for name suggestions and the item's current look. */
  catalog: CatalogSuggestion[];
  defaultLocation?: FridgeLocation;
  today: string;
  submitLabel?: string;
  /** Show a "Save & add another" button (new items only). */
  allowAddAnother?: boolean;
};

const QUICK_EXPIRY = [
  { label: "+3 days", days: 3 },
  { label: "+1 week", days: 7 },
  { label: "+2 weeks", days: 14 },
  { label: "+1 month", days: 30 },
  { label: "+3 months", days: 90 },
];

/** Model <select> value meaning "guess from the name" (stored as null). "" = emoji only (stored as "none"). */
const AUTO = "__auto";
const toSelect = (stored: string | null | undefined) => (stored === "none" ? "" : stored ?? AUTO);

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function FridgeForm(props: Props) {
  const [state, formAction] = useActionState<FridgeFormState, FormData>(props.action, undefined);

  useEffect(() => {
    if (state?.savedAt && state.success) toast.success(state.success);
  }, [state?.savedAt, state?.success]);

  return (
    <form action={formAction} className="grid gap-5">
      {state?.error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
      {/* Re-keyed after each "add another" save: fields reset, focus returns to Name, location is kept. */}
      <FridgeFields key={state?.savedAt ?? 0} {...props} defaultLocation={state?.location ?? props.defaultLocation} />
    </form>
  );
}

function FridgeFields({ item, catalog, defaultLocation = "fridge", today, submitLabel = "Save item", allowAddAnother = false }: Props) {
  const current = item?.catalog_id ? catalog.find((c) => c.id === item.catalog_id) : undefined;
  const [name, setName] = useState(item?.name ?? "");
  const [location, setLocation] = useState<FridgeLocation>(item?.location ?? defaultLocation);
  const [unit, setUnit] = useState<FridgeUnit>(item?.unit ?? "pcs");
  const [expiresOn, setExpiresOn] = useState(item?.expires_on ?? "");
  const [emoji, setEmoji] = useState(current?.emoji ?? "");
  const [model, setModel] = useState(toSelect(current?.model));
  const [focused, setFocused] = useState(false);

  const query = name.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!query) return [];
    return catalog
      .filter((c) => c.name.toLowerCase() !== query && c.name.toLowerCase().includes(query))
      .sort((a, b) => Number(b.name.toLowerCase().startsWith(query)) - Number(a.name.toLowerCase().startsWith(query)) || b.use_count - a.use_count)
      .slice(0, 6);
  }, [catalog, query]);
  const frequent = useMemo(() => [...catalog].sort((a, b) => b.use_count - a.use_count).slice(0, 10), [catalog]);

  const guessEmoji = foodEmoji(name, unit, location);
  const guessModel = foodModel(name);

  function pick(c: CatalogSuggestion) {
    setName(c.name);
    if (c.default_location && FRIDGE_LOCATIONS.some((l) => l.value === c.default_location)) setLocation(c.default_location);
    if (c.default_unit) setUnit(c.default_unit);
    setExpiresOn(c.shelf_life_days !== null ? addDays(today, c.shelf_life_days) : "");
    setEmoji(c.emoji ?? "");
    setModel(toSelect(c.model));
    setFocused(false);
  }

  return (
    <>
      {!item && frequent.length > 0 && !query && (
        <div className="grid gap-1.5">
          <p className="text-sm font-medium">Quick add</p>
          <div className="flex flex-wrap gap-1.5">
            {frequent.map((c) => (
              <Button key={c.id} type="button" variant="outline" size="sm" onClick={() => pick(c)}>
                <span aria-hidden>{c.emoji ?? foodEmoji(c.name)}</span> {c.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="name">Name</Label>
        <div className="flex gap-2">
          <Input
            name="emoji"
            aria-label="Emoji"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder={guessEmoji}
            className="w-12 shrink-0 text-center text-lg"
            maxLength={8}
          />
          <div className="relative flex-1">
            <Input
              id="name"
              name="name"
              required
              autoComplete="off"
              value={name}
              onChange={(e) => { setName(e.target.value); setFocused(true); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => { if (e.key === "Escape") setFocused(false); }}
              placeholder="Milk"
              autoFocus={!item}
              role="combobox"
              aria-expanded={focused && suggestions.length > 0}
              aria-controls="name-suggestions"
              aria-autocomplete="list"
            />
            {focused && suggestions.length > 0 && (
              <ul id="name-suggestions" role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border bg-popover shadow-md">
                {suggestions.map((c) => (
                  <li key={c.id} role="option" aria-selected={false}>
                    {/* preventDefault on mousedown keeps focus in the input so the list doesn't close before the click. */}
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(c)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span aria-hidden>{c.emoji ?? foodEmoji(c.name)}</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[c.default_unit, c.shelf_life_days !== null && `${c.shelf_life_days}d`].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Location</legend>
        <div className="grid grid-cols-2 gap-2">
          {FRIDGE_LOCATIONS.map((l) => (
            <label
              key={l.value}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                "has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary",
                "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              )}
            >
              <input type="radio" name="location" value={l.value} checked={location === l.value} onChange={() => setLocation(l.value)} className="sr-only" />
              <span aria-hidden>{l.icon}</span> {l.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="quantity">Quantity</Label>
          <Input id="quantity" name="quantity" type="number" inputMode="decimal" min="0.01" step="any" required defaultValue={item?.quantity ?? 1} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="unit">Unit</Label>
          <NativeSelect id="unit" name="unit" value={unit} onChange={(e) => setUnit(e.target.value as FridgeUnit)} className="w-24">
            {FRIDGE_UNITS.map((u) => <NativeSelectOption key={u.value} value={u.value}>{u.label}</NativeSelectOption>)}
          </NativeSelect>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="expires_on">Expires</Label>
        <Input id="expires_on" name="expires_on" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
        <div className="flex flex-wrap gap-1.5">
          {QUICK_EXPIRY.map((q) => (
            <Button key={q.days} type="button" variant="outline" size="sm" onClick={() => setExpiresOn(addDays(today, q.days))}>
              {q.label}
            </Button>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => setExpiresOn("")}>Clear</Button>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="model">3D model</Label>
        <NativeSelect id="model" name="model" value={model} onChange={(e) => setModel(e.target.value)} className="w-full">
          <NativeSelectOption value={AUTO}>Auto ({guessModel ? modelLabel(guessModel) : "emoji only"})</NativeSelectOption>
          <NativeSelectOption value="">Emoji only</NativeSelectOption>
          {FOOD_MODELS.map((m) => <NativeSelectOption key={m} value={m}>{modelLabel(m)}</NativeSelectOption>)}
        </NativeSelect>
        <p className="text-xs text-muted-foreground">Emoji and model are remembered for “{name.trim() || "this food"}” next time.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5"><Label htmlFor="added_on">Added</Label><Input id="added_on" name="added_on" type="date" defaultValue={item?.added_on ?? today} /></div>
        <div className="grid gap-1.5"><Label htmlFor="opened_on">Opened</Label><Input id="opened_on" name="opened_on" type="date" defaultValue={item?.opened_on ?? ""} /></div>
      </div>

      <div className="grid gap-1.5"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" rows={2} defaultValue={item?.notes ?? ""} /></div>
      <div className="grid gap-2">
        <SubmitButton size="lg">{submitLabel}</SubmitButton>
        {allowAddAnother && (
          <SubmitButton size="lg" variant="outline" name="intent" value="another">Save & add another</SubmitButton>
        )}
      </div>
    </>
  );
}
