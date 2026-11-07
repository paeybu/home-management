"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { refreshMenu } from "@/app/(app)/fridge/cook/actions";
import type { MenuFilters } from "@/lib/menu";

/** Regenerates suggestions for the current filters (passed as hidden fields). */
export function MenuRefreshButton({ filters }: { filters: MenuFilters }) {
  const [state, action] = useActionState(refreshMenu, undefined);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      {filters.mainIds.map((id) => <input key={id} type="hidden" name="main" value={id} />)}
      {filters.cuisines.map((c) => <input key={c} type="hidden" name="cuisine" value={c} />)}
      <SubmitButton size="sm" variant="outline">
        <RefreshCw aria-hidden /> New ideas
      </SubmitButton>
      {state?.error && <p role="alert" className="text-xs text-red-700 dark:text-red-300">{state.error}</p>}
    </form>
  );
}
