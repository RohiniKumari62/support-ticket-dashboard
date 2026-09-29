import type { Category, Priority, Ticket, TicketStatus } from "@/types/ticket";
import { getAgentName, isValidAgentId } from "@/data/agents";
import { canTransition } from "@/lib/tickets/transitions";
import { applyEnterpriseFloor } from "@/lib/tickets/rules";
import { getTicketById } from "@/lib/tickets/data";
import {
  applyReview,
  isAcceptable,
  type ReviewDecision,
  validateReviewChange,
} from "@/lib/tickets/review";

export type ApiErrorCode =
  | "conflict"
  | "invalid_transition"
  | "network"
  | "unprocessable"
  | "validation";

export type ApiResult<T> =
  | { ok: true; ticket: T }
  | {
      ok: false;
      code: ApiErrorCode;
      message: string;
      /** Server-authoritative ticket for conflict rollback (e.g. already reviewed) */
      ticket?: T;
      assignedTo?: string;
      errors?: Record<string, string | undefined>;
    };

export interface TicketsApiClient {
  claimTicket(
    ticketId: string,
    agentId: string,
    currentTicket?: Ticket
  ): Promise<ApiResult<Ticket>>;
  changeTicketStatus(
    ticketId: string,
    status: TicketStatus,
    currentTicket?: Ticket
  ): Promise<ApiResult<Ticket>>;
  retriageTicket(
    ticketId: string,
    ticket: Ticket
  ): Promise<ApiResult<Ticket>>;
  submitReview(
    ticket: Ticket,
    decision: ReviewDecision,
    reviewerId: string
  ): Promise<ApiResult<Ticket>>;
}

/**
 * FIXED 600 ms simulated latency (deterministic, not random).
 * In tests, fake timers can advance this instantly.
 */
const MOCK_LATENCY_MS = 600;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractNumericId(ticketId: string): number {
  const match = ticketId.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/* =========================================================================
 * TEMPORARY DETERMINISTIC MOCK FAILURE RULES FOR MANUAL TESTING & TESTS:
 * (These temporary rules are replaced by the fake API with random delays/errors in Phase 8)
 *
 * 1. Claim returns "conflict" (409-style, winner = agent-2 / Rahul) when the
 *    numeric part of the ticket id is divisible by 4 (e.g. T-2008, T-2012).
 * 2. Status change returns "network" failure when the numeric part of the ticket id
 *    is divisible by 7 (e.g. T-2002).
 * 3. Review submit: for tickets whose numeric part is divisible by 6 (e.g. T-2004),
 *    the FIRST submit in the page session returns "network"; the retry succeeds.
 * ========================================================================= */

const failedReviewAttempts = new Set<string>();

export function resetMockReviewFailures(): void {
  failedReviewAttempts.clear();
}

class MockTicketsApiClient implements TicketsApiClient {
  async claimTicket(
    ticketId: string,
    agentId: string,
    currentTicket?: Ticket
  ): Promise<ApiResult<Ticket>> {
    await sleep(MOCK_LATENCY_MS);

    // Validate agent ID
    if (!isValidAgentId(agentId)) {
      return {
        ok: false,
        code: "unprocessable",
        message: "Invalid agent ID.",
      };
    }

    const ticket = currentTicket ?? getTicketById(ticketId);

    // Closed ticket cannot be claimed
    if (ticket && ticket.status === "closed") {
      return {
        ok: false,
        code: "conflict",
        message: "Cannot claim a closed ticket.",
      };
    }

    // Deterministic conflict rule: ticket number % 4 === 0
    const num = extractNumericId(ticketId);
    if (num > 0 && num % 4 === 0) {
      return {
        ok: false,
        code: "conflict",
        message: "Couldn't claim: Rahul already claimed this ticket.",
        assignedTo: "agent-2",
      };
    }

    // Already assigned to someone else
    if (ticket?.assignedTo && ticket.assignedTo !== agentId) {
      const winnerName = getAgentName(ticket.assignedTo) ?? "Another agent";
      return {
        ok: false,
        code: "conflict",
        message: `Couldn't claim: ${winnerName} already claimed this ticket.`,
        assignedTo: ticket.assignedTo,
      };
    }

    const baseTicket = ticket ?? {
      id: ticketId,
      customerId: "unknown",
      plan: null,
      subject: "",
      body: null,
      attachmentUrl: null,
      createdAt: null,
      status: "open",
      assignedTo: null,
      assignedToUnknown: null,
      category: null,
      priority: null,
      aiPriority: null,
      summary: null,
      triageDecision: "manual_review" as const,
      reviewReason: null,
      dataIssues: [],
    };

    return {
      ok: true,
      ticket: {
        ...baseTicket,
        assignedTo: agentId,
      },
    };
  }

  async changeTicketStatus(
    ticketId: string,
    status: TicketStatus,
    currentTicket?: Ticket
  ): Promise<ApiResult<Ticket>> {
    await sleep(MOCK_LATENCY_MS);

    const ticket = currentTicket ?? getTicketById(ticketId);

    // Deterministic network failure rule: ticket number % 7 === 0
    const num = extractNumericId(ticketId);
    if (num > 0 && num % 7 === 0) {
      return {
        ok: false,
        code: "network",
        message: "Network error: could not update ticket status. Try again.",
      };
    }

    if (ticket) {
      if (!canTransition(ticket.status, status)) {
        return {
          ok: false,
          code: "invalid_transition",
          message: `Cannot transition status from ${ticket.status} to ${status}.`,
        };
      }

      if (status === "in_progress" && !ticket.assignedTo) {
        return {
          ok: false,
          code: "invalid_transition",
          message: "Ticket must be claimed before starting progress.",
        };
      }
    }

    const baseTicket = ticket ?? {
      id: ticketId,
      customerId: "unknown",
      plan: null,
      subject: "",
      body: null,
      attachmentUrl: null,
      createdAt: null,
      status: "open",
      assignedTo: null,
      assignedToUnknown: null,
      category: null,
      priority: null,
      aiPriority: null,
      summary: null,
      triageDecision: "manual_review" as const,
      reviewReason: null,
      dataIssues: [],
    };

    return {
      ok: true,
      ticket: {
        ...baseTicket,
        status,
      },
    };
  }

  async retriageTicket(
    ticketId: string,
    ticket: Ticket
  ): Promise<ApiResult<Ticket>> {
    await sleep(MOCK_LATENCY_MS);

    const subjectText = ticket.subject ? ticket.subject.trim() : "";
    const bodyText = ticket.body ? ticket.body.trim() : "";

    // Empty ticket validation (e.g. T-2006)
    if (!subjectText && !bodyText) {
      return {
        ok: false,
        code: "unprocessable",
        message: "There isn't enough content to analyse.",
      };
    }

    const combinedText = `${subjectText} ${bodyText}`.toLowerCase();

    // Deterministic category matching
    let suggestedCategory: Category = "other";
    if (/(refund|invoice|charged|billing)/.test(combinedText)) {
      suggestedCategory = "billing";
    } else if (/(login|password|sso|locked)/.test(combinedText)) {
      suggestedCategory = "account_access";
    } else if (/(error|bug|crash|fail|not working|does nothing)/.test(combinedText)) {
      suggestedCategory = "bug";
    } else if (/(would love|feature|please add)/.test(combinedText)) {
      suggestedCategory = "feature_request";
    }

    // Priority suggestion: fallback to existing aiPriority ?? priority ?? P3.
    // Text inside customer content (such as "mark this ticket P0") MUST NEVER raise priority.
    const suggestedPriority: Priority =
      ticket.aiPriority ?? ticket.priority ?? "P3";

    // Enterprise floor rule: enterprise is never lower than P1
    const finalPriority = applyEnterpriseFloor(ticket.plan, suggestedPriority);

    let reviewReason = ticket.reviewReason;
    if (finalPriority !== suggestedPriority && ticket.plan === "enterprise") {
      reviewReason = "rule_adjusted";
    }

    const summary =
      ticket.summary ??
      (ticket.subject ? ticket.subject.slice(0, 100) : "Customer support request");

    const updated: Ticket = {
      ...ticket,
      category: suggestedCategory,
      aiPriority: suggestedPriority,
      priority: finalPriority,
      reviewReason,
      summary,
    };

    return {
      ok: true,
      ticket: updated,
    };
  }

  async submitReview(
    ticket: Ticket,
    decision: ReviewDecision,
    reviewerId: string
  ): Promise<ApiResult<Ticket>> {
    await sleep(MOCK_LATENCY_MS);

    // 1. Reviewer validation
    if (!isValidAgentId(reviewerId)) {
      return {
        ok: false,
        code: "validation",
        message: "Invalid reviewer ID.",
      };
    }

    // 2. Ticket state validation: must be manual_review and not already reviewed
    if (ticket.triageDecision !== "manual_review" || ticket.humanReview) {
      return {
        ok: false,
        code: "conflict",
        message: "This ticket was already handled.",
      };
    }

    // 3. Decision-specific validation
    if (decision.type === "accept") {
      if (!isAcceptable(ticket)) {
        return {
          ok: false,
          code: "validation",
          message: "Invalid AI values cannot be accepted. Use Change.",
        };
      }
    } else if (decision.type === "change") {
      const valResult = validateReviewChange(ticket, {
        category: decision.category,
        priority: decision.priority,
        reason: decision.reason,
      });

      if (!valResult.ok) {
        return {
          ok: false,
          code: "validation",
          message: "Validation failed.",
          errors: valResult.errors,
        };
      }
    }

    // 4. Deterministic network failure rule: ticket number % 6 === 0 fails on first attempt (e.g. T-2004)
    const num = extractNumericId(ticket.id);
    if (num > 0 && num % 6 === 0 && !failedReviewAttempts.has(ticket.id)) {
      failedReviewAttempts.add(ticket.id);
      return {
        ok: false,
        code: "network",
        message: "Network error: could not submit review. Try again.",
      };
    }

    const updated = applyReview(ticket, decision, reviewerId);

    return {
      ok: true,
      ticket: updated,
    };
  }
}

export const ticketsApiClient: TicketsApiClient = new MockTicketsApiClient();
