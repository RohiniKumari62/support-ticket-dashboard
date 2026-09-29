import type { Ticket, TicketStatus } from "@/types/ticket";
import { getAgentName, isValidAgentId } from "@/data/agents";

export const ALLOWED_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  open: ["in_progress"],
  in_progress: ["resolved"],
  resolved: ["open"],
  closed: [],
};

export const TRANSITION_LABELS: Record<TicketStatus, Record<string, string>> = {
  open: {
    in_progress: "Start progress",
  },
  in_progress: {
    resolved: "Mark resolved",
  },
  resolved: {
    open: "Reopen",
  },
  closed: {},
};

export function getAllowedTransitions(
  status: TicketStatus | null | undefined
): TicketStatus[] {
  if (!status || !(status in ALLOWED_TRANSITIONS)) {
    return [];
  }
  return [...ALLOWED_TRANSITIONS[status]];
}

export function canTransition(
  from: TicketStatus | null | undefined,
  to: TicketStatus
): boolean {
  return getAllowedTransitions(from).includes(to);
}

export interface StatusAction {
  targetStatus: TicketStatus;
  label: string;
  enabled: boolean;
  reason?: string;
}

export interface StatusActionResult extends Array<StatusAction> {
  reason?: string;
  in_progress?: StatusAction;
  resolved?: StatusAction;
  open?: StatusAction;
  [key: string]: unknown;
}

/**
 * Returns the status action state for all allowed transitions from the ticket's current status.
 * Evaluates assignee requirements, agent mismatch, unknown agent, and closed status.
 */
export function getStatusActionState(
  ticket: Ticket,
  currentAgentId: string
): StatusActionResult {
  const allowed = getAllowedTransitions(ticket.status);
  const actions: StatusAction[] = [];

  // Determine global block reason if any
  let blockReason: string | undefined;
  if (ticket.status === "closed") {
    blockReason = "Closed tickets can't be changed";
  } else if (!ticket.status) {
    blockReason = "Ticket has an invalid status";
  } else if (ticket.assignedToUnknown || (ticket.assignedTo && !isValidAgentId(ticket.assignedTo))) {
    blockReason = "Assigned to an unknown agent";
  } else if (ticket.assignedTo && ticket.assignedTo !== currentAgentId) {
    const name = getAgentName(ticket.assignedTo) ?? "another agent";
    blockReason = `Assigned to ${name}`;
  }

  for (const target of allowed) {
    const label = TRANSITION_LABELS[ticket.status as TicketStatus]?.[target] ?? target;
    let enabled = true;
    let reason: string | undefined = blockReason;

    if (reason) {
      enabled = false;
    } else if (target === "in_progress" && !ticket.assignedTo) {
      enabled = false;
      reason = "Claim this ticket first";
    }

    actions.push({
      targetStatus: target,
      label,
      enabled,
      reason,
    });
  }

  const result = actions as StatusActionResult;
  result.reason = blockReason;
  for (const a of actions) {
    (result as Record<string, unknown>)[a.targetStatus] = a;
  }

  return result;
}

/**
 * Helper to check a specific transition target's validity and enabled state.
 */
export function getStatusActionStateForTarget(
  ticket: Ticket,
  target: TicketStatus,
  currentAgentId: string
): { enabled: boolean; reason?: string } {
  if (ticket.status === "closed") {
    return { enabled: false, reason: "Closed tickets can't be changed" };
  }
  if (!ticket.status) {
    return { enabled: false, reason: "Ticket has an invalid status" };
  }
  if (!canTransition(ticket.status, target)) {
    return { enabled: false, reason: `Cannot transition from ${ticket.status} to ${target}` };
  }

  if (ticket.assignedToUnknown || (ticket.assignedTo && !isValidAgentId(ticket.assignedTo))) {
    return { enabled: false, reason: "Assigned to an unknown agent" };
  }
  if (ticket.assignedTo && ticket.assignedTo !== currentAgentId) {
    const name = getAgentName(ticket.assignedTo) ?? "another agent";
    return { enabled: false, reason: `Assigned to ${name}` };
  }
  if (target === "in_progress" && !ticket.assignedTo) {
    return { enabled: false, reason: "Claim this ticket first" };
  }

  return { enabled: true };
}
