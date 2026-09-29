import type { Ticket } from "@/types/ticket";

/**
 * Checks if a ticket has a valid, current created_at date (not future or invalid).
 */
function isNormalDateTicket(ticket: Ticket): boolean {
  if (!ticket.createdAt) return false;
  if (
    ticket.dataIssues.includes("future_created_at") ||
    ticket.dataIssues.includes("invalid_created_at")
  ) {
    return false;
  }
  return true;
}

/**
 * Sorts tickets with newest first by createdAt.
 * Tickets with future dates or null/invalid dates are sorted AFTER normal tickets.
 */
export function sortTickets(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => {
    const aNormal = isNormalDateTicket(a);
    const bNormal = isNormalDateTicket(b);

    // Normal tickets come before abnormal (future / invalid / null) tickets
    if (aNormal && !bNormal) return -1;
    if (!aNormal && bNormal) return 1;

    // Both are normal
    if (aNormal && bNormal && a.createdAt && b.createdAt) {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      if (bTime !== aTime) {
        return bTime - aTime; // Newest first
      }
      return a.id.localeCompare(b.id);
    }

    // Both are abnormal
    if (a.createdAt && b.createdAt) {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      if (bTime !== aTime) {
        return bTime - aTime;
      }
      return a.id.localeCompare(b.id);
    }

    if (a.createdAt && !b.createdAt) return -1;
    if (!a.createdAt && b.createdAt) return 1;

    return a.id.localeCompare(b.id);
  });
}
