/**
 * HTTP-based TicketsApiClient that calls the Next.js Route Handlers.
 * Used in the browser; the mock client is still used in tests.
 */
import type { Ticket, TicketStatus } from "@/types/ticket";
import type { ApiErrorCode, ApiResult, TicketsApiClient } from "./tickets-client";
import type { ReviewDecision } from "@/lib/tickets/review";

type ApiErrorResult = Extract<ApiResult<Ticket>, { ok: false }>;

/** Normalise server error body to ApiErrorResult */
async function parseErrorResponse(
  res: Response
): Promise<ApiErrorResult> {
  let code: ApiErrorCode = "network";
  let message = `Request failed (${res.status}).`;
  let ticket: Ticket | undefined;
  let assignedTo: string | undefined;

  try {
    const body = await res.json();
    const err = body?.error;
    if (err) {
      // Map server codes to client ApiErrorCode
      const serverCode = String(err.code ?? "");
      const mapped: ApiErrorCode =
        serverCode === "conflict" ||
        serverCode === "not_in_review" ||
        serverCode === "already_reviewed"
          ? "conflict"
          : serverCode === "invalid_transition" ||
            serverCode === "claim_required" ||
            serverCode === "not_assignee"
          ? "invalid_transition"
          : serverCode === "validation_failed" ||
            serverCode === "invalid_request"
          ? "validation"
          : serverCode === "internal_error" ||
            serverCode === "service_unavailable" ||
            serverCode === "triage_not_configured" ||
            serverCode === "ai_unavailable" ||
            serverCode === "ai_invalid_output"
          ? "network"
          : "unprocessable";
      code = mapped;
      message = String(err.message ?? message);
    }
    if (body?.ticket) {
      ticket = body.ticket as Ticket;
      // A conflict on claim carries the winner's assignedTo
      if (
        code === "conflict" &&
        ticket?.assignedTo &&
        typeof ticket.assignedTo === "string"
      ) {
        assignedTo = ticket.assignedTo;
      }
    }
  } catch {
    // ignore parse failure; keep defaults
  }

  return { ok: false, code, message, ticket, assignedTo };
}

class HttpTicketsApiClient implements TicketsApiClient {
  async claimTicket(
    ticketId: string,
    agentId: string
  ): Promise<ApiResult<Ticket>> {
    let res: Response;
    try {
      res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
    } catch {
      return {
        ok: false,
        code: "network",
        message: "Couldn't claim this ticket. Nothing was changed. Try again.",
      };
    }

    if (!res.ok) {
      return parseErrorResponse(res);
    }

    try {
      const body = await res.json();
      return { ok: true, ticket: body.ticket as Ticket };
    } catch {
      return {
        ok: false,
        code: "network",
        message: "Unexpected response from server.",
      };
    }
  }

  async changeTicketStatus(
    ticketId: string,
    status: TicketStatus,
    _currentTicket?: Ticket
  ): Promise<ApiResult<Ticket>> {
    // The status route requires agentId; we pass the current ticket's assignedTo
    // or fall back to an empty string which the server will reject with a clear error.
    const agentId = _currentTicket?.assignedTo ?? "";

    let res: Response;
    try {
      res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, status }),
      });
    } catch {
      return {
        ok: false,
        code: "network",
        message: "Couldn't update status. Nothing was changed. Try again.",
      };
    }

    if (!res.ok) {
      return parseErrorResponse(res);
    }

    try {
      const body = await res.json();
      return { ok: true, ticket: body.ticket as Ticket };
    } catch {
      return {
        ok: false,
        code: "network",
        message: "Unexpected response from server.",
      };
    }
  }

  async retriageTicket(
    ticketId: string,
    ticket: Ticket
  ): Promise<ApiResult<Ticket>> {
    let res: Response;
    try {
      // The retriage endpoint reads the ticket from the server store by ID.
      // We send the agentId so the server can gate the call if needed.
      res = await fetch(
        `/api/tickets/${encodeURIComponent(ticketId)}/retriage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: ticket.assignedTo ?? "agent-1" }),
        }
      );
    } catch {
      return {
        ok: false,
        code: "network",
        message: "AI review failed. The ticket was not changed.",
      };
    }

    if (!res.ok) {
      const result = await parseErrorResponse(res);
      // Remap server-specific codes to the expected client codes
      if (result.code === "network" && res.status === 422) {
        return { ...result, code: "unprocessable" };
      }
      if (res.status === 409) {
        return { ...result, code: "conflict" };
      }
      return result;
    }

    try {
      const body = await res.json();
      return { ok: true, ticket: body.ticket as Ticket };
    } catch {
      return {
        ok: false,
        code: "network",
        message: "Unexpected response from server.",
      };
    }
  }

  async submitReview(
    ticket: Ticket,
    decision: ReviewDecision,
    reviewerId: string
  ): Promise<ApiResult<Ticket>> {
    const body =
      decision.type === "accept"
        ? { agentId: reviewerId, decision: "accept" as const, reason: "" }
        : {
            agentId: reviewerId,
            decision: "change" as const,
            category: decision.category,
            priority: decision.priority,
            reason: decision.reason,
          };

    let res: Response;
    try {
      res = await fetch(
        `/api/tickets/${encodeURIComponent(ticket.id)}/triage`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
    } catch {
      return {
        ok: false,
        code: "network",
        message: "Network error: could not submit review. Try again.",
      };
    }

    if (!res.ok) {
      return parseErrorResponse(res);
    }

    try {
      const resBody = await res.json();
      return { ok: true, ticket: resBody.ticket as Ticket };
    } catch {
      return {
        ok: false,
        code: "network",
        message: "Unexpected response from server.",
      };
    }
  }
}

export const httpTicketsApiClient: TicketsApiClient =
  new HttpTicketsApiClient();
