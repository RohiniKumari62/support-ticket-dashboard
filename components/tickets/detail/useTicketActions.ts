"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Ticket, TicketStatus } from "@/types/ticket";
import { getAgentName } from "@/data/agents";
import { getStatusLabel } from "@/lib/tickets/labels";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  selectInFlightAction,
  selectTicketById,
} from "@/lib/store/tickets-selectors";
import {
  claimTicketThunk,
  changeStatusThunk,
  retriageTicketThunk,
} from "@/lib/store/tickets-thunks";
import { ticketReceivedFromServer } from "@/lib/store/tickets-slice";
import {
  formatClaimConflictMessage,
  formatClaimErrorMessage,
  formatStatusErrorMessage,
} from "@/lib/tickets/action-messages";
import type { TicketsApiClient } from "@/lib/api/tickets-client";

export type PendingActionType = "claim" | "status" | "retriage" | null;

export interface ActionFeedback {
  kind: "success" | "error" | "info";
  text: string;
}

export interface UseTicketActionsProps {
  initialTicket?: Ticket;
  ticketId?: string;
  currentAgentId: string;
  api?: TicketsApiClient;
}

export function useTicketActions({
  initialTicket,
  ticketId: propTicketId,
  currentAgentId,
}: UseTicketActionsProps) {
  const dispatch = useAppDispatch();
  const id = propTicketId ?? initialTicket?.id ?? "";

  const storeTicket = useAppSelector((state) => selectTicketById(state, id));
  const inFlight = useAppSelector((state) => selectInFlightAction(state, id));

  const ticket = storeTicket ?? initialTicket ?? ({} as Ticket);
  const pendingAction: PendingActionType =
    inFlight && (inFlight.action === "claim" || inFlight.action === "status" || inFlight.action === "retriage")
      ? (inFlight.action as PendingActionType)
      : null;

  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  // Track previous assignedTo to detect external claims while viewing
  const prevAssignedToRef = useRef<string | null>(ticket.assignedTo ?? null);

  useEffect(() => {
    const prev = prevAssignedToRef.current;
    const current = ticket.assignedTo ?? null;
    prevAssignedToRef.current = current;

    // Detect if another valid agent claimed the ticket while we were viewing it without active local inFlight
    if (
      prev !== current &&
      current !== null &&
      current !== currentAgentId &&
      !inFlight
    ) {
      const winnerName = getAgentName(current) ?? "Another agent";
      setFeedback({
        kind: "info",
        text: `${winnerName} claimed this ticket while you were viewing it.`,
      });
    }
  }, [ticket.assignedTo, currentAgentId, inFlight]);

  const handleClaim = useCallback(async () => {
    if (!ticket.id) return;
    const action = await dispatch(
      claimTicketThunk({ ticketId: ticket.id, agentId: currentAgentId })
    );

    if (claimTicketThunk.fulfilled.match(action)) {
      setFeedback({
        kind: "success",
        text: "Ticket claimed successfully.",
      });
    } else if (claimTicketThunk.rejected.match(action)) {
      if (action.meta.condition) {
        // Ignored by condition check (e.g. duplicate click)
        return;
      }
      const payload = action.payload;
      if (payload?.code === "conflict" && payload.assignedTo) {
        setFeedback({
          kind: "error",
          text: formatClaimConflictMessage(payload.assignedTo),
        });
      } else {
        setFeedback({
          kind: "error",
          text: formatClaimErrorMessage(payload?.message),
        });
      }
    }
  }, [currentAgentId, dispatch, ticket.id]);

  const handleStatusChange = useCallback(
    async (targetStatus: TicketStatus) => {
      if (!ticket.id) return;
      const action = await dispatch(
        changeStatusThunk({
          ticketId: ticket.id,
          status: targetStatus,
          agentId: currentAgentId,
        })
      );

      if (changeStatusThunk.fulfilled.match(action)) {
        setFeedback({
          kind: "success",
          text: `Status updated to ${getStatusLabel(targetStatus).toLowerCase()}.`,
        });
      } else if (changeStatusThunk.rejected.match(action)) {
        if (action.meta.condition) {
          return;
        }
        const payload = action.payload;
        setFeedback({
          kind: "error",
          text: formatStatusErrorMessage(payload?.message),
        });
      }
    },
    [currentAgentId, dispatch, ticket.id]
  );

  const handleRetriage = useCallback(async () => {
    if (!ticket.id) return;
    const action = await dispatch(retriageTicketThunk({ ticketId: ticket.id }));

    if (retriageTicketThunk.fulfilled.match(action)) {
      setFeedback({
        kind: "success",
        text: "AI review re-run completed.",
      });
    } else if (retriageTicketThunk.rejected.match(action)) {
      if (action.meta.condition) {
        return;
      }
      const payload = action.payload;
      setFeedback({
        kind: "error",
        text: payload?.message || "AI review failed. The ticket was not changed.",
      });
    }
  }, [dispatch, ticket.id]);

  const applyServerTicket = useCallback(
    (incoming: Ticket) => {
      dispatch(ticketReceivedFromServer(incoming));
    },
    [dispatch]
  );

  return {
    ticket,
    pendingAction,
    feedback,
    handleClaim,
    handleStatusChange,
    handleRetriage,
    applyServerTicket,
  };
}
