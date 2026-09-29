import type { Ticket, TicketStatus } from "@/types/ticket";
import { getAgentName } from "@/data/agents";
import { canTransition, getStatusActionStateForTarget } from "./transitions";

export const MAX_BULK_SELECTION = 50;

export type BulkActionKind = "claim" | "status";
export type BulkItemOutcome = "success" | "failed" | "skipped";

export interface BulkTicketResult {
  ticketId: string;
  subject: string;
  outcome: BulkItemOutcome;
  message: string;
}

export type BulkEligibility =
  | { eligible: true }
  | { eligible: false; reason: string };

/**
 * Evaluates whether a ticket is eligible for bulk claim or bulk status change.
 * Returns an explanatory reason when ineligible so UI can report skipped items.
 */
export function getBulkEligibility(
  kind: BulkActionKind,
  ticket: Ticket,
  agentId: string,
  target?: TicketStatus
): BulkEligibility {
  if (kind === "claim") {
    if (ticket.status === "closed") {
      return { eligible: false, reason: "Closed tickets can't be changed" };
    }
    if (ticket.status !== "open") {
      return { eligible: false, reason: "Only open tickets can be claimed" };
    }
    if (ticket.assignedTo === agentId) {
      return { eligible: false, reason: "Already assigned to you" };
    }
    if (ticket.assignedTo) {
      const name = getAgentName(ticket.assignedTo) ?? "another agent";
      return { eligible: false, reason: `Already assigned to ${name}` };
    }
    if (ticket.assignedToUnknown) {
      return { eligible: false, reason: "Assigned to an unknown agent" };
    }
    return { eligible: true };
  }

  if (kind === "status") {
    if (!target) {
      return { eligible: false, reason: "No target status selected" };
    }
    if (ticket.status === "closed") {
      return { eligible: false, reason: "Closed tickets can't be changed" };
    }
    if (!ticket.status) {
      return { eligible: false, reason: "Ticket has an invalid status" };
    }
    if (ticket.status === target) {
      return { eligible: false, reason: `Already in ${target.replace("_", " ")} status` };
    }
    if (!canTransition(ticket.status, target)) {
      return { eligible: false, reason: `Cannot transition from ${ticket.status} to ${target}` };
    }

    const targetCheck = getStatusActionStateForTarget(ticket, target, agentId);
    if (!targetCheck.enabled) {
      return { eligible: false, reason: targetCheck.reason ?? "Action not allowed" };
    }

    return { eligible: true };
  }

  return { eligible: false, reason: "Unknown bulk action" };
}
