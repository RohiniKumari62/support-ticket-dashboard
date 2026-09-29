import type { TicketStatus } from "@/types/ticket";
import { getAgentName } from "@/data/agents";
import { getStatusLabel } from "@/lib/tickets/labels";

export function formatClaimSuccessMessage(): string {
  return "Ticket claimed successfully.";
}

export function formatClaimConflictMessage(assignedTo: string | null | undefined): string {
  const winnerName = (assignedTo && getAgentName(assignedTo)) || "Another agent";
  return `Couldn't claim: ${winnerName} already claimed this ticket.`;
}

export function formatClaimErrorMessage(message?: string): string {
  return message || "Couldn't claim this ticket. Nothing was changed. Try again.";
}

export function formatStatusSuccessMessage(status: TicketStatus): string {
  return `Status updated to ${getStatusLabel(status).toLowerCase()}.`;
}

export function formatStatusErrorMessage(message?: string): string {
  return message || "Couldn't update status. Nothing was changed. Try again.";
}

export function formatReviewSuccessMessage(ticketId: string, type: "accept" | "change"): string {
  if (type === "accept") {
    return `${ticketId} accepted and removed from the queue.`;
  }
  return `${ticketId} updated and removed from the queue.`;
}

export function formatReviewErrorMessage(ticketId: string, message?: string): string {
  if (message) {
    return `Couldn't save ${ticketId}: ${message}. The ticket is back in the queue.`;
  }
  return `Couldn't save ${ticketId}: Network error. The ticket is back in the queue.`;
}

export function formatRetriageSuccessMessage(): string {
  return "AI review re-run completed.";
}

export function formatRetriageErrorMessage(message?: string): string {
  return message || "AI review failed. The ticket was not changed.";
}
