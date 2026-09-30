"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import type { Ticket } from "@/types/ticket";
import { makeStore, type AppStore } from "@/lib/store/store";
import { ticketsSeeded } from "@/lib/store/tickets-slice";
import { cursorInitialized } from "@/lib/store/live-slice";
import { agentHydrated } from "@/lib/store/agent-slice";
import { readStoredAgentId } from "@/lib/agents/agent-storage";
import { httpTicketsApiClient } from "@/lib/api/http-tickets-client";
import { LiveUpdatesController } from "./LiveUpdatesController";

export interface StoreProviderProps {
  initialTickets: Ticket[];
  duplicatesRemoved?: number;
  /** ISO server time used as the initial live-update cursor */
  initialServerTime: string;
  /** Server store instance ID used to detect restarts */
  initialInstanceId: string;
  children: React.ReactNode;
}

export function StoreProvider({
  initialTickets,
  duplicatesRemoved = 0,
  initialServerTime,
  initialInstanceId,
  children,
}: StoreProviderProps) {
  const [store] = useState<AppStore>(() => {
    const s = makeStore(undefined, { api: httpTicketsApiClient });
    s.dispatch(ticketsSeeded({ tickets: initialTickets, duplicatesRemoved }));
    s.dispatch(
      cursorInitialized({
        cursor: initialServerTime,
        instanceId: initialInstanceId,
      })
    );
    return s;
  });

  useEffect(() => {
    // Hydrate agent identity from localStorage once mounted on client
    const storedAgentId = readStoredAgentId();
    store.dispatch(agentHydrated(storedAgentId));
  }, [store]);

  return (
    <Provider store={store}>
      <LiveUpdatesController
        initialServerTime={initialServerTime}
        initialInstanceId={initialInstanceId}
      />
      {children}
    </Provider>
  );
}
