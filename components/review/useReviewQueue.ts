"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Category, Priority, Ticket } from "@/types/ticket";
import { ticketsApiClient, type TicketsApiClient } from "@/lib/api/tickets-client";

export interface ChangeDraft {
  category: Category | "" | null;
  priority: Priority | "" | null;
  reason: string;
}

export interface QueueItemState {
  ticket: Ticket;
  phase: "idle" | "done";
  saving: boolean;
  error: string | null;
  draft: ChangeDraft | null;
}

export interface ReviewFeedback {
  kind: "success" | "error";
  text: string;
}

export interface UseReviewQueueProps {
  initialTickets: Ticket[];
  currentAgentId: string;
  api?: TicketsApiClient;
}

export function useReviewQueue({
  initialTickets,
  currentAgentId,
  api = ticketsApiClient,
}: UseReviewQueueProps) {
  // Preserve stable initial sort order via IDs
  const [orderedIds] = useState<string[]>(() => initialTickets.map((t) => t.id));

  // State of each queue item keyed by ticket id
  const [items, setItems] = useState<Record<string, QueueItemState>>(() => {
    const map: Record<string, QueueItemState> = {};
    for (const ticket of initialTickets) {
      map[ticket.id] = {
        ticket,
        phase: "idle",
        saving: false,
        error: null,
        draft: null,
      };
    }
    return map;
  });

  const [feedback, setFeedback] = useState<ReviewFeedback | null>(null);

  // Synchronous per-ticket lock Set: prevents duplicate clicks on the same ticket while saving
  const savingLocksRef = useRef<Set<string>>(new Set());

  // Ref to latest items for avoiding stale closure reads inside async handlers
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const accept = useCallback(
    async (ticketId: string) => {
      if (savingLocksRef.current.has(ticketId)) return;
      savingLocksRef.current.add(ticketId);

      const snapshot = itemsRef.current[ticketId];
      if (!snapshot || snapshot.phase === "done") {
        savingLocksRef.current.delete(ticketId);
        return;
      }

      // Optimistic removal: phase becomes "done" immediately
      setItems((prev) => {
        const item = prev[ticketId];
        if (!item) return prev;
        return {
          ...prev,
          [ticketId]: { ...item, phase: "done", saving: true, error: null },
        };
      });

      try {
        const res = await api.submitReview(
          snapshot.ticket,
          { type: "accept" },
          currentAgentId
        );

        if (res.ok) {
          setItems((prev) => {
            const item = prev[ticketId];
            if (!item) return prev;
            return {
              ...prev,
              [ticketId]: { ...item, ticket: res.ticket, saving: false },
            };
          });
          setFeedback({
            kind: "success",
            text: `${ticketId} accepted and removed from the queue.`,
          });
        } else {
          if (res.code === "conflict") {
            // Already handled: stays removed
            setItems((prev) => {
              const item = prev[ticketId];
              if (!item) return prev;
              return {
                ...prev,
                [ticketId]: { ...item, saving: false },
              };
            });
            setFeedback({
              kind: "error",
              text: `${ticketId} was already handled in another session.`,
            });
          } else {
            // Restore snapshot in the same position
            setItems((prev) => ({
              ...prev,
              [ticketId]: {
                ...snapshot,
                phase: "idle",
                saving: false,
                error: res.message,
              },
            }));
            setFeedback({
              kind: "error",
              text: `Couldn't save ${ticketId}: ${res.message}. The ticket is back in the queue.`,
            });
          }
        }
      } catch {
        setItems((prev) => ({
          ...prev,
          [ticketId]: {
            ...snapshot,
            phase: "idle",
            saving: false,
            error: "Failed to connect. Please try again.",
          },
        }));
        setFeedback({
          kind: "error",
          text: `Couldn't save ${ticketId}: Network error. The ticket is back in the queue.`,
        });
      } finally {
        savingLocksRef.current.delete(ticketId);
      }
    },
    [api, currentAgentId]
  );

  const change = useCallback(
    async (
      ticketId: string,
      input: {
        category: Category;
        priority: Priority;
        reason: string;
      }
    ) => {
      if (savingLocksRef.current.has(ticketId)) return;
      savingLocksRef.current.add(ticketId);

      const snapshot = itemsRef.current[ticketId];
      if (!snapshot || snapshot.phase === "done") {
        savingLocksRef.current.delete(ticketId);
        return;
      }

      // Optimistic removal: phase becomes "done" immediately
      setItems((prev) => {
        const item = prev[ticketId];
        if (!item) return prev;
        return {
          ...prev,
          [ticketId]: { ...item, phase: "done", saving: true, error: null },
        };
      });

      try {
        const res = await api.submitReview(
          snapshot.ticket,
          {
            type: "change",
            category: input.category,
            priority: input.priority,
            reason: input.reason,
          },
          currentAgentId
        );

        if (res.ok) {
          setItems((prev) => {
            const item = prev[ticketId];
            if (!item) return prev;
            return {
              ...prev,
              [ticketId]: { ...item, ticket: res.ticket, saving: false },
            };
          });
          setFeedback({
            kind: "success",
            text: `${ticketId} updated and removed from the queue.`,
          });
        } else {
          if (res.code === "conflict") {
            setItems((prev) => {
              const item = prev[ticketId];
              if (!item) return prev;
              return {
                ...prev,
                [ticketId]: { ...item, saving: false },
              };
            });
            setFeedback({
              kind: "error",
              text: `${ticketId} was already handled in another session.`,
            });
          } else {
            // Restore snapshot with draft preserved so user reason isn't lost
            setItems((prev) => ({
              ...prev,
              [ticketId]: {
                ...snapshot,
                phase: "idle",
                saving: false,
                error: res.message,
                draft: input,
              },
            }));
            setFeedback({
              kind: "error",
              text: `Couldn't save ${ticketId}: ${res.message}. The ticket is back in the queue.`,
            });
          }
        }
      } catch {
        setItems((prev) => ({
          ...prev,
          [ticketId]: {
            ...snapshot,
            phase: "idle",
            saving: false,
            error: "Failed to connect. Please try again.",
            draft: input,
          },
        }));
        setFeedback({
          kind: "error",
          text: `Couldn't save ${ticketId}: Network error. The ticket is back in the queue.`,
        });
      } finally {
        savingLocksRef.current.delete(ticketId);
      }
    },
    [api, currentAgentId]
  );

  const dismissFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  // Compute visible items in original sorted order
  const visibleItems = orderedIds
    .map((id) => items[id])
    .filter((item): item is QueueItemState => item !== undefined && item.phase === "idle");

  return {
    items,
    visibleItems,
    remainingCount: visibleItems.length,
    accept,
    change,
    feedback,
    dismissFeedback,
  };
}
