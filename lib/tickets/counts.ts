import type { Ticket } from "@/types/ticket";
import { isValidAgentId } from "@/data/agents";

/**
 * Returns true if the ticket is awaiting human review:
 * triageDecision === "manual_review" and humanReview == null.
 */
export function isPendingReview(t: Ticket): boolean {
  return t.triageDecision === "manual_review" && !t.humanReview;
}

/**
 * Returns true if the ticket is an active ticket assigned to the specified agent:
 * assignedTo === agentId and status is "open" or "in_progress".
 */
export function isMyActiveTicket(t: Ticket, agentId: string): boolean {
  return (
    t.assignedTo === agentId &&
    (t.status === "open" || t.status === "in_progress")
  );
}

/**
 * Returns true if the ticket affects any header badge count:
 * Either pending review OR assigned to a valid agent with status "open" or "in_progress".
 */
export function isCountedTicket(t: Ticket): boolean {
  if (isPendingReview(t)) {
    return true;
  }
  return Boolean(
    t.assignedTo &&
      isValidAgentId(t.assignedTo) &&
      (t.status === "open" || t.status === "in_progress")
  );
}
