import { createAppAsyncThunk } from "./hooks";
import type { Ticket, TicketStatus } from "@/types/ticket";
import type { ApiErrorCode } from "@/lib/api/tickets-client";
import { isValidAgentId } from "@/data/agents";
import { canTransition, getStatusActionStateForTarget } from "@/lib/tickets/transitions";
import {
  isAcceptable,
  type ReviewDecision,
  validateReviewChange,
} from "@/lib/tickets/review";
import {
  getBulkEligibility,
  MAX_BULK_SELECTION,
  type BulkActionKind,
  type BulkTicketResult,
} from "@/lib/tickets/bulk";
import {
  formatClaimConflictMessage,
  formatClaimErrorMessage,
  formatStatusErrorMessage,
} from "@/lib/tickets/action-messages";
import { setBulkProgress, setBulkRunning } from "./tickets-slice";

/** Payload shape passed to rejectWithValue so the slice can apply conflict rollback. */
export interface ThunkRejectPayload {
  code: ApiErrorCode | "network";
  message: string;
  /** Server-provided winner ticket for conflict rollback */
  ticket?: Ticket;
  /** Assigned-to agent ID from a claim conflict */
  assignedTo?: string;
  errors?: Record<string, string | undefined>;
}

export interface ClaimTicketArg {
  ticketId: string;
  agentId: string;
}

export const claimTicketThunk = createAppAsyncThunk<
  { ticket: Ticket },
  ClaimTicketArg,
  { rejectValue: ThunkRejectPayload }
>(
  "tickets/claim",
  async ({ ticketId, agentId }, { extra, getState, rejectWithValue }) => {
    const currentTicket = getState().tickets.byId[ticketId];
    try {
      const res = await extra.api.claimTicket(ticketId, agentId, currentTicket);
      if (!res.ok) {
        return rejectWithValue({
          code: res.code,
          message: res.message,
          ticket: res.ticket,
          assignedTo: res.assignedTo,
        });
      }
      return { ticket: res.ticket };
    } catch {
      return rejectWithValue({
        code: "network",
        message: "Couldn't claim this ticket. Nothing was changed. Try again.",
      });
    }
  },
  {
    condition: ({ ticketId, agentId }, { getState }) => {
      const state = getState();
      const ticket = state.tickets.byId[ticketId];
      if (!ticket) return false;
      if (state.tickets.inFlight[ticketId]) return false;
      if (ticket.status !== "open" || ticket.assignedTo !== null) return false;
      if (!isValidAgentId(agentId)) return false;
      return true;
    },
  }
);

export interface ChangeStatusArg {
  ticketId: string;
  status: TicketStatus;
  agentId: string;
}

export const changeStatusThunk = createAppAsyncThunk<
  { ticket: Ticket },
  ChangeStatusArg,
  { rejectValue: ThunkRejectPayload }
>(
  "tickets/changeStatus",
  async ({ ticketId, status }, { extra, getState, rejectWithValue }) => {
    const currentTicket = getState().tickets.byId[ticketId];
    try {
      const res = await extra.api.changeTicketStatus(ticketId, status, currentTicket);
      if (!res.ok) {
        return rejectWithValue({
          code: res.code,
          message: res.message,
          ticket: res.ticket,
        });
      }
      return { ticket: res.ticket };
    } catch {
      return rejectWithValue({
        code: "network",
        message: "Couldn't update status. Nothing was changed. Try again.",
      });
    }
  },
  {
    condition: ({ ticketId, status, agentId }, { getState }) => {
      const state = getState();
      const ticket = state.tickets.byId[ticketId];
      if (!ticket) return false;
      if (state.tickets.inFlight[ticketId]) return false;
      if (!canTransition(ticket.status, status)) return false;
      const targetCheck = getStatusActionStateForTarget(ticket, status, agentId);
      if (!targetCheck.enabled) return false;
      return true;
    },
  }
);

export interface ReviewTicketArg {
  ticketId: string;
  decision: ReviewDecision;
  reviewerId: string;
}

export const reviewTicketThunk = createAppAsyncThunk<
  { ticket: Ticket },
  ReviewTicketArg,
  { rejectValue: ThunkRejectPayload }
>(
  "tickets/review",
  async ({ ticketId, decision, reviewerId }, { extra, getState, rejectWithValue }) => {
    const currentTicket = getState().tickets.byId[ticketId];
    try {
      const res = await extra.api.submitReview(currentTicket, decision, reviewerId);
      if (!res.ok) {
        return rejectWithValue({
          code: res.code,
          message: res.message,
          ticket: res.ticket,
        });
      }
      return { ticket: res.ticket };
    } catch {
      return rejectWithValue({
        code: "network",
        message: "Network error: could not submit review. Try again.",
      });
    }
  },
  {
    condition: ({ ticketId, decision, reviewerId }, { getState }) => {
      const state = getState();
      const ticket = state.tickets.byId[ticketId];
      if (!ticket) return false;
      if (state.tickets.inFlight[ticketId]) return false;
      if (ticket.triageDecision !== "manual_review" || ticket.humanReview) return false;
      if (!isValidAgentId(reviewerId)) return false;
      if (decision.type === "accept" && !isAcceptable(ticket)) return false;
      if (decision.type === "change") {
        const valResult = validateReviewChange(ticket, decision);
        if (!valResult.ok) return false;
      }
      return true;
    },
  }
);

export interface RetriageTicketArg {
  ticketId: string;
}

export const retriageTicketThunk = createAppAsyncThunk<
  { ticket: Ticket },
  RetriageTicketArg,
  { rejectValue: ThunkRejectPayload }
>(
  "tickets/retriage",
  async ({ ticketId }, { extra, getState, rejectWithValue }) => {
    const currentTicket = getState().tickets.byId[ticketId];
    try {
      const res = await extra.api.retriageTicket(ticketId, currentTicket);
      if (!res.ok) {
        return rejectWithValue({
          code: res.code,
          message: res.message,
        });
      }
      return { ticket: res.ticket };
    } catch {
      return rejectWithValue({
        code: "network",
        message: "AI review failed. The ticket was not changed.",
      });
    }
  },
  {
    condition: ({ ticketId }, { getState }) => {
      const state = getState();
      const ticket = state.tickets.byId[ticketId];
      if (!ticket) return false;
      if (state.tickets.inFlight[ticketId]) return false;
      if (!ticket.subject?.trim() && !ticket.body?.trim()) return false;
      return true;
    },
  }
);

export interface BulkRunArg {
  kind: BulkActionKind;
  target?: TicketStatus;
  ticketIds: string[];
  agentId: string;
}

export const bulkRunThunk = createAppAsyncThunk<
  BulkTicketResult[],
  BulkRunArg
>(
  "tickets/bulkRun",
  async ({ kind, target, ticketIds, agentId }, { dispatch, getState }) => {
    dispatch(setBulkRunning(true));

    const state = getState();
    const ticketsById = state.tickets.byId;

    // 1. Evaluate eligibility for all tickets in selection order
    const eligibilityMap = new Map<string, { eligible: boolean; reason?: string }>();
    let eligibleCount = 0;

    for (const id of ticketIds) {
      const ticket = ticketsById[id];
      if (!ticket) {
        eligibilityMap.set(id, { eligible: false, reason: "Ticket not found" });
        continue;
      }
      const check = getBulkEligibility(kind, ticket, agentId, target);
      if (check.eligible) {
        eligibilityMap.set(id, { eligible: true });
        eligibleCount++;
      } else {
        eligibilityMap.set(id, { eligible: false, reason: check.reason });
      }
    }

    dispatch(setBulkProgress({ done: 0, total: eligibleCount }));

    let doneCount = 0;

    // 2. Execute each eligible ticket as its own thunk concurrently
    const promises = ticketIds.map(async (id): Promise<BulkTicketResult> => {
      const ticket = getState().tickets.byId[id];
      const subject = ticket?.subject || "(No subject)";
      const eligibility = eligibilityMap.get(id);

      if (!eligibility || !eligibility.eligible) {
        return {
          ticketId: id,
          subject,
          outcome: "skipped",
          message: eligibility?.reason || "Ineligible",
        };
      }

      try {
        if (kind === "claim") {
          const action = await dispatch(claimTicketThunk({ ticketId: id, agentId }));
          doneCount++;
          dispatch(setBulkProgress({ done: doneCount, total: eligibleCount }));

          if (claimTicketThunk.fulfilled.match(action)) {
            return {
              ticketId: id,
              subject,
              outcome: "success",
              message: "Claimed",
            };
          } else {
            const payload = action.payload;
            let msg = formatClaimErrorMessage(payload?.message);
            if (payload?.code === "conflict" && payload.assignedTo) {
              msg = formatClaimConflictMessage(payload.assignedTo);
            }
            return {
              ticketId: id,
              subject,
              outcome: "failed",
              message: msg,
            };
          }
        } else {
          // Status change
          const targetStatus = target as TicketStatus;
          const action = await dispatch(
            changeStatusThunk({ ticketId: id, status: targetStatus, agentId })
          );
          doneCount++;
          dispatch(setBulkProgress({ done: doneCount, total: eligibleCount }));

          if (changeStatusThunk.fulfilled.match(action)) {
            return {
              ticketId: id,
              subject,
              outcome: "success",
              message: `Updated to ${targetStatus.replace("_", " ")}`,
            };
          } else {
            const payload = action.payload;
            return {
              ticketId: id,
              subject,
              outcome: "failed",
              message: formatStatusErrorMessage(payload?.message),
            };
          }
        }
      } catch {
        doneCount++;
        dispatch(setBulkProgress({ done: doneCount, total: eligibleCount }));
        return {
          ticketId: id,
          subject,
          outcome: "failed",
          message: "Request failed. Nothing was changed.",
        };
      }
    });

    try {
      const results = await Promise.all(promises);
      return results;
    } finally {
      dispatch(setBulkRunning(false));
    }
  },
  {
    condition: ({ ticketIds }, { getState }) => {
      const state = getState();
      if (state.tickets.bulk.running) return false;
      if (ticketIds.length === 0 || ticketIds.length > MAX_BULK_SELECTION) return false;
      return true;
    },
  }
);
