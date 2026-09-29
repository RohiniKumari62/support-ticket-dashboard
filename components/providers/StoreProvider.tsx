"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import type { Ticket } from "@/types/ticket";
import { makeStore, type AppStore } from "@/lib/store/store";
import { ticketsSeeded } from "@/lib/store/tickets-slice";
import { agentHydrated } from "@/lib/store/agent-slice";
import { readStoredAgentId } from "@/lib/agents/agent-storage";

export interface StoreProviderProps {
  initialTickets: Ticket[];
  duplicatesRemoved?: number;
  children: React.ReactNode;
}

export function StoreProvider({
  initialTickets,
  duplicatesRemoved = 0,
  children,
}: StoreProviderProps) {
  const [store] = useState<AppStore>(() => {
    const s = makeStore();
    s.dispatch(ticketsSeeded({ tickets: initialTickets, duplicatesRemoved }));
    return s;
  });

  useEffect(() => {
    // Hydrate agent identity from localStorage once mounted on client
    const storedAgentId = readStoredAgentId();
    store.dispatch(agentHydrated(storedAgentId));
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}
