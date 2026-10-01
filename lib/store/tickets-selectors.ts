import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "./store";
import type { Ticket } from "@/types/ticket";
import { sortTickets } from "@/lib/tickets/sort";
import { getReviewQueue } from "@/lib/tickets/review";

export const selectTicketsState = (state: RootState) => state.tickets;
export const selectTicketsById = (state: RootState) => state.tickets.byId;
export const selectTicketIds = (state: RootState) => state.tickets.ids;
export const selectDuplicatesRemoved = (state: RootState) =>
  state.tickets.duplicatesRemoved;

export const selectTicketById = (
  state: RootState,
  id: string
): Ticket | null => state.tickets.byId[id] ?? null;

export const selectInFlightAction = (state: RootState, id: string) =>
  state.tickets.inFlight[id] ?? null;

export const selectCurrentAgentId = (state: RootState) =>
  state.agent.currentAgentId;
export const selectAgentHydrated = (state: RootState) => state.agent.hydrated;
export const selectCountsBootstrapped = (state: RootState) =>
  state.tickets.countsBootstrapped;

export const selectBulkState = (state: RootState) => state.tickets.bulk;

export const selectFilters = (state: RootState) => state.filters;

/**
 * Returns all tickets in insertion/order array.
 * Memoized: keeps referential identity unless ids or byId changes.
 */
export const selectAllTickets = createSelector(
  [selectTicketsById, selectTicketIds],
  (byId, ids): Ticket[] => {
    const list: Ticket[] = [];
    for (const id of ids) {
      const ticket = byId[id];
      if (ticket) list.push(ticket);
    }
    return list;
  }
);

/**
 * Returns all tickets sorted according to Phase 2 default sort rules:
 * Newest created first (missing/future last) -> ID ascending.
 */
export const selectTicketsSorted = createSelector(
  [selectAllTickets],
  (tickets) => sortTickets(tickets)
);

/**
 * My tickets count: active tickets assigned to current agent (open or in_progress).
 * Resolved, closed, unassigned, or unknown-agent tickets are excluded.
 */
export const selectMyTicketsCount = createSelector(
  [selectAllTickets, selectCurrentAgentId],
  (tickets, currentAgentId): number => {
    return tickets.filter(
      (t) =>
        t.assignedTo === currentAgentId &&
        (t.status === "open" || t.status === "in_progress")
    ).length;
  }
);

/**
 * Review queue: tickets with triageDecision === 'manual_review' and humanReview == null.
 * Uses getReviewQueue from lib/tickets/review.
 */
export const selectReviewQueue = createSelector(
  [selectAllTickets],
  (tickets): Ticket[] => getReviewQueue(tickets)
);

/**
 * To review count: derived from selectReviewQueue length.
 */
export const selectReviewCount = createSelector(
  [selectReviewQueue],
  (queue): number => queue.length
);

// ─── Live update selectors ────────────────────────────────────────────────────
export const selectLiveState = (state: RootState) => state.live;
export const selectPendingNewIds = (state: RootState) =>
  state.live.pendingNewIds;
export const selectPendingNewCount = (state: RootState) =>
  state.live.pendingNewIds.length;
export const selectLiveStatus = (state: RootState) => state.live.status;
export const selectLiveCursor = (state: RootState) => state.live.cursor;
export const selectLiveInstanceId = (state: RootState) => state.live.instanceId;
