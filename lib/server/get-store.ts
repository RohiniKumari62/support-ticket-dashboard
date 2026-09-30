import { createTicketStore, TicketStore } from "./ticket-store";
import { buildSeed } from "./seed";

declare global {
  var __ticketStore__: TicketStore | undefined;
}

/**
 * Returns the application-wide TicketStore instance.
 * Preserved on globalThis across Next.js dev server HMR reloads.
 */
export function getTicketStore(): TicketStore {
  if (!globalThis.__ticketStore__) {
    const seed = buildSeed({ now: Date.now(), random: Math.random });
    globalThis.__ticketStore__ = createTicketStore({
      tickets: seed.tickets,
      duplicatesRemoved: seed.duplicatesRemoved,
      now: Date.now(),
      random: Math.random,
    });
  }
  return globalThis.__ticketStore__;
}

/**
 * Resets or replaces the singleton TicketStore for automated tests.
 */
export function resetTicketStoreForTests(store?: TicketStore): void {
  globalThis.__ticketStore__ = store;
}
