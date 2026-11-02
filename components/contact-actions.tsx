"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore, Mail, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setContactArchived } from "@/app/(app)/contacts/actions";
import { lineHref, mailHref, telHref } from "@/lib/contacts";
import type { Contact } from "@/lib/types";

/** Call / LINE / email buttons. `compact` renders icon-only buttons for list rows. */
export function ContactChannels({ contact, compact = false }: { contact: Pick<Contact, "name" | "phone" | "email" | "line_id">; compact?: boolean }) {
  const size = compact ? "icon-sm" : "sm";
  const variant = compact ? "ghost" : "outline";
  return (
    <>
      {contact.phone && (
        <Button render={<a href={telHref(contact.phone)} />} size={size} variant={variant} aria-label={`Call ${contact.name}`}>
          <Phone aria-hidden />{!compact && " Call"}
        </Button>
      )}
      {contact.line_id && (
        <Button render={<a href={lineHref(contact.line_id)} target="_blank" rel="noreferrer" />} size={size} variant={variant} aria-label={`LINE ${contact.name}`}>
          <MessageCircle aria-hidden />{!compact && " LINE"}
        </Button>
      )}
      {contact.email && (
        <Button render={<a href={mailHref(contact.email)} />} size={size} variant={variant} aria-label={`Email ${contact.name}`}>
          <Mail aria-hidden />{!compact && " Email"}
        </Button>
      )}
    </>
  );
}

export function ContactArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => start(async () => { await setContactArchived(id, !archived); toast.success(archived ? "Contact restored" : "Contact archived"); })}
    >
      {archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />} {archived ? "Restore" : "Archive"}
    </Button>
  );
}
