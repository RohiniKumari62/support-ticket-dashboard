import type { Ticket } from "@/types/ticket";
import { getAgentName } from "@/data/agents";

export interface ReconcileNotice {
  kind: "info" | "error" | "success";
  text: string;
}

export interface ReconcileResult {
  ticket: Ticket;
  notice: ReconcileNotice | null;
}

/**
 * Reconciles incoming server state into the agent's current view.
 * If another agent claimed the ticket while viewing, updates the assignee
 * and generates an informational notice.
 * If our own claim was pending and the server says another agent claimed it,
 * the server truth wins and the pending change is replaced.
 */
export function reconcileTicket(
  current: Ticket,
  incoming: Ticket,
  currentAgentId: string,
  options?: { isClaimPending?: boolean }
): ReconcileResult {
  let notice: ReconcileNotice | null = null;

  const isPending = options?.isClaimPending ?? false;
  const incomingAssignedTo = incoming.assignedTo;

  // Case 1: Another agent claimed while viewing
  // (incoming has another valid agent as assignee, different from current assignedTo,
  // or different from currentAgentId when claim was pending)
  const isAnotherAgent =
    incomingAssignedTo !== null &&
    incomingAssignedTo !== currentAgentId;

  const assigneeChangedToAnother =
    isAnotherAgent &&
    (incomingAssignedTo !== current.assignedTo || isPending);

  if (assigneeChangedToAnother) {
    const name = getAgentName(incomingAssignedTo) ?? "Another agent";
    notice = {
      kind: "info",
      text: `${name} claimed this ticket while you were viewing it.`,
    };
  }

  return {
    ticket: {
      ...current,
      ...incoming,
      assignedTo: incomingAssignedTo,
    },
    notice,
  };
}
