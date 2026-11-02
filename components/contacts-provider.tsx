"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Contact } from "@/lib/types";

export type ContactOption = Pick<Contact, "id" | "name" | "role" | "company">;

const ContactsContext = createContext<ContactOption[]>([]);

/** Active contacts loaded once in the app layout, so deep components (Mark done sheet) can offer a "Done by" picker. */
export function ContactsProvider({ contacts, children }: { contacts: ContactOption[]; children: ReactNode }) {
  return <ContactsContext.Provider value={contacts}>{children}</ContactsContext.Provider>;
}

export const useContacts = () => useContext(ContactsContext);
