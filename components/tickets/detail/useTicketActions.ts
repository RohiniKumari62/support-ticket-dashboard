"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Ticket, TicketStatus } from "@/types/ticket";
import { getAgentName } from "@/data/agents";
import { getStatusLabel } from "@/lib/tickets/labels";
import { reconcileTicket } from "@/lib/tickets/reconcile";
import { ticketsApiClient, type TicketsApiClient } from "@/lib/api/tickets-client";

export type PendingActionType = "claim" | "status" | "retriage" | null;

export interface ActionFeedback {
  kind: "success" | "error" | "info";
  text: string;
}

export interface UseTicketActionsProps {
  initialTicket: Ticket;
  currentAgentId: string;
  api?: TicketsApiClient;
}

export function useTicketActions({
  initialTicket,
  currentAgentId,
  api = ticketsApiClient,
}: UseTicketActionsProps) {
  const [ticket, setTicket] = useState<Ticket>(initialTicket);
  const [pendingAction, setPendingAction] = useState<PendingActionType>(null);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  // Synchronous lock ref to prevent rapid double-clicks from making duplicate API calls
  const isLockedRef = useRef(false);
  const ticketRef = useRef(ticket);

  useEffect(() => {
    ticketRef.current = ticket;
  }, [ticket]);

  const handleClaim = useCallback(async () => {
    if (isLockedRef.current) return;
    isLockedRef.current = true;
    setPendingAction("claim");

    const snapshot = ticketRef.current;
    // Optimistic update
    setTicket((prev) => ({ ...prev, assignedTo: currentAgentId }));

    try {
      const res = await api.claimTicket(snapshot.id, currentAgentId, snapshot);
      if (res.ok) {
        setTicket(res.ticket);
        setFeedback({
          kind: "success",
          text: "Ticket claimed successfully.",
        });
      } else {
        if (res.code === "conflict" && res.assignedTo) {
          const winner = res.assignedTo;
          const winnerName = getAgentName(winner) ?? "Another agent";
          setTicket({ ...snapshot, assignedTo: winner });
          setFeedback({
            kind: "error",
            text: `Couldn't claim: ${winnerName} already claimed this ticket.`,
          });
        } else {
          setTicket(snapshot);
          setFeedback({
            kind: "error",
            text:
              res.message ||
              "Couldn't claim this ticket. Nothing was changed. Try again.",
          });
        }
      }
    } catch {
      setTicket(snapshot);
      setFeedback({
        kind: "error",
        text: "Couldn't claim this ticket. Nothing was changed. Try again.",
      });
    } finally {
      isLockedRef.current = false;
      setPendingAction(null);
    }
  }, [api, currentAgentId]);

  const handleStatusChange = useCallback(
    async (targetStatus: TicketStatus) => {
      if (isLockedRef.current) return;
      isLockedRef.current = true;
      setPendingAction("status");

      const snapshot = ticketRef.current;
      // Optimistic update
      setTicket((prev) => ({ ...prev, status: targetStatus }));

      try {
        const res = await api.changeTicketStatus(snapshot.id, targetStatus, snapshot);
        if (res.ok) {
          setTicket(res.ticket);
          setFeedback({
            kind: "success",
            text: `Status updated to ${getStatusLabel(targetStatus).toLowerCase()}.`,
          });
        } else {
          setTicket(snapshot);
          setFeedback({
            kind: "error",
            text:
              res.message ||
              "Couldn't update status. Nothing was changed. Try again.",
          });
        }
      } catch {
        setTicket(snapshot);
        setFeedback({
          kind: "error",
          text: "Couldn't update status. Nothing was changed. Try again.",
        });
      } finally {
        isLockedRef.current = false;
        setPendingAction(null);
      }
    },
    [api]
  );

  const handleRetriage = useCallback(async () => {
    if (isLockedRef.current) return;
    isLockedRef.current = true;
    setPendingAction("retriage");

    const current = ticketRef.current;

    try {
      const res = await api.retriageTicket(current.id, current);
      if (res.ok) {
        setTicket(res.ticket);
        setFeedback({
          kind: "success",
          text: "AI review re-run completed.",
        });
      } else {
        setFeedback({
          kind: "error",
          text: res.message || "AI review failed. The ticket was not changed.",
        });
      }
    } catch {
      setFeedback({
        kind: "error",
        text: "AI review failed. The ticket was not changed.",
      });
    } finally {
      isLockedRef.current = false;
      setPendingAction(null);
    }
  }, [api]);

  const applyServerTicket = useCallback(
    (incoming: Ticket) => {
      const result = reconcileTicket(
        ticketRef.current,
        incoming,
        currentAgentId,
        { isClaimPending: pendingAction === "claim" }
      );
      setTicket(result.ticket);
      if (result.notice) {
        setFeedback(result.notice);
      }
    },
    [currentAgentId, pendingAction]
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
