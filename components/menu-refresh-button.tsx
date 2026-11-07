"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { refreshMenu } from "@/app/(app)/fridge/cook/actions";

export function MenuRefreshButton() {
  const [state, action] = useActionState(refreshMenu, undefined);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <SubmitButton size="sm" variant="outline">
        <RefreshCw aria-hidden /> New ideas
      </SubmitButton>
      {state?.error && <p role="alert" className="text-xs text-red-700 dark:text-red-300">{state.error}</p>}
    </form>
  );
}
