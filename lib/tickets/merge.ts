import type { Ticket } from "@/types/ticket";

/**
 * Returns true if the incoming ticket has a strictly higher version than the existing ticket.
 */
export function isNewer(incoming: Ticket, existing: Ticket): boolean {
  return incoming.version > existing.version;
}

/**
 * Returns the ticket with the higher version.
 * If versions are equal, returns `a` (ties -> a) to preserve object identity.
 */
export function pickNewer(a: Ticket, b: Ticket): Ticket {
  if (b.version > a.version) {
    return b;
  }
  return a;
}
