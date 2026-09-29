"use client";

import { useCallback, useState } from "react";
import type { Category, Priority, Ticket } from "@/types/ticket";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  selectCurrentAgentId,
  selectReviewQueue,
} from "@/lib/store/tickets-selectors";
import { reviewTicketThunk } from "@/lib/store/tickets-thunks";
import {
  formatReviewErrorMessage,
  formatReviewSuccessMessage,
} from "@/lib/tickets/action-messages";
import type { TicketsApiClient } from "@/lib/api/tickets-client";

export interface ChangeDraft {
  category: Category | "" | null;
  priority: Priority | "" | null;
  reason: string;
}

export interface ReviewFeedback {
  kind: "success" | "error";
  text: string;
}

export interface UseReviewQueueProps {
  initialTickets?: Ticket[];
  currentAgentId?: string;
  api?: TicketsApiClient;
}

export function useReviewQueue({
  currentAgentId: propCurrentAgentId,
}: UseReviewQueueProps = {}) {
  const dispatch = useAppDispatch();
  const storeAgentId = useAppSelector(selectCurrentAgentId);
  const currentAgentId = propCurrentAgentId ?? storeAgentId;

  const queueTickets = useAppSelector(selectReviewQueue);

  const [drafts, setDrafts] = useState<Record<string, ChangeDraft>>({});
  const [itemErrors, setItemErrors] = useState<Record<string, string | null>>({});
  const [feedback, setFeedback] = useState<ReviewFeedback | null>(null);

  const accept = useCallback(
    async (ticketId: string) => {
      const action = await dispatch(
        reviewTicketThunk({
          ticketId,
          decision: { type: "accept" },
          reviewerId: currentAgentId,
        })
      );

      if (reviewTicketThunk.fulfilled.match(action)) {
        setFeedback({
          kind: "success",
          text: formatReviewSuccessMessage(ticketId, "accept"),
        });
        setItemErrors((prev) => {
          const next = { ...prev };
          delete next[ticketId];
          return next;
        });
      } else if (reviewTicketThunk.rejected.match(action)) {
        if (action.meta.condition) {
          return;
        }
        const payload = action.payload;
        const msg = payload?.message || "Network error. The ticket is back in the queue.";
        setItemErrors((prev) => ({
          ...prev,
          [ticketId]: payload?.message ?? "Network error",
        }));
        setFeedback({
          kind: "error",
          text: formatReviewErrorMessage(ticketId, msg),
        });
      }
    },
    [currentAgentId, dispatch]
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
      const action = await dispatch(
        reviewTicketThunk({
          ticketId,
          decision: {
            type: "change",
            category: input.category,
            priority: input.priority,
            reason: input.reason,
          },
          reviewerId: currentAgentId,
        })
      );

      if (reviewTicketThunk.fulfilled.match(action)) {
        setFeedback({
          kind: "success",
          text: formatReviewSuccessMessage(ticketId, "change"),
        });
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[ticketId];
          return next;
        });
        setItemErrors((prev) => {
          const next = { ...prev };
          delete next[ticketId];
          return next;
        });
      } else if (reviewTicketThunk.rejected.match(action)) {
        if (action.meta.condition) {
          return;
        }
        const payload = action.payload;
        const msg = payload?.message || "Network error. The ticket is back in the queue.";
        setDrafts((prev) => ({
          ...prev,
          [ticketId]: input,
        }));
        setItemErrors((prev) => ({
          ...prev,
          [ticketId]: payload?.message ?? "Network error",
        }));
        setFeedback({
          kind: "error",
          text: formatReviewErrorMessage(ticketId, msg),
        });
      }
    },
    [currentAgentId, dispatch]
  );

  const dismissFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  return {
    tickets: queueTickets,
    remainingCount: queueTickets.length,
    accept,
    change,
    feedback,
    dismissFeedback,
    drafts,
    itemErrors,
  };
}
