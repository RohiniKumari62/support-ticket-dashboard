import { RAW_TICKETS } from "@/data/mock-tickets";
import { normalizeTickets } from "@/lib/tickets/normalize";
import type { Ticket } from "@/types/ticket";

/**
 * Returns all normalized, deduplicated tickets along with duplicates count.
 */
export function getNormalizedTicketsData(now: Date = new Date()): {
  tickets: Ticket[];
  duplicatesRemoved: number;
} {
  return normalizeTickets(RAW_TICKETS, now);
}

/**
 * Returns all normalized, deduplicated tickets.
 */
export function getNormalizedTickets(now: Date = new Date()): Ticket[] {
  const { tickets } = normalizeTickets(RAW_TICKETS, now);
  return tickets;
}

/**
 * Retrieves a single normalized ticket by external_id.
 * Returns null if the ticket is not found or id is invalid.
 */
export function getTicketById(
  id: string | null | undefined,
  now: Date = new Date()
): Ticket | null {
  if (!id || typeof id !== "string") {
    return null;
  }
  const tickets = getNormalizedTickets(now);
  return tickets.find((t) => t.id === id) ?? null;
}
