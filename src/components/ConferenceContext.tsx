"use client";

import { createContext, useContext, type ReactNode } from "react";
import { getConference, type Conference } from "@config/conferences";

const ConferenceContext = createContext<Conference | null>(null);

/** Makes the selected conference (and its paper rules) available to every check below it. */
export function ConferenceProvider({ id, children }: { id: string; children: ReactNode }) {
  const conference = getConference(id);
  if (!conference) throw new Error(`Unknown conference "${id}"`);
  return <ConferenceContext.Provider value={conference}>{children}</ConferenceContext.Provider>;
}

export function useConference(): Conference {
  const c = useContext(ConferenceContext);
  if (!c) throw new Error("useConference must be used inside <ConferenceProvider>");
  return c;
}
