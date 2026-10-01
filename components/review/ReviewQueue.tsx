"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Category, Priority, Ticket } from "@/types/ticket";
import type { TicketsApiClient } from "@/lib/api/tickets-client";
import { useReviewQueue } from "./useReviewQueue";
import { ReviewItem } from "./ReviewItem";
import { useAppSelector } from "@/lib/store/hooks";
import {
  selectCountsBootstrapped,
  selectInFlightAction,
} from "@/lib/store/tickets-selectors";

export interface ReviewQueueProps {
  tickets?: Ticket[];
  currentAgentId?: string;
  api?: TicketsApiClient;
}

function ReviewItemRow({
  ticket,
  draft,
  error,
  onAccept,
  onChange,
  subjectLinkRef,
}: {
  ticket: Ticket;
  draft: import("./useReviewQueue").ChangeDraft | null;
  error: string | null;
  onAccept: (id: string) => void;
  onChange: (id: string, input: { category: Category; priority: Priority; reason: string }) => void;
  subjectLinkRef?: (el: HTMLAnchorElement | null) => void;
}) {
  const inFlight = useAppSelector((state) => selectInFlightAction(state, ticket.id));
  const isSaving = inFlight?.action === "review";

  return (
    <ReviewItem
      ticket={ticket}
      saving={isSaving}
      error={error}
      draft={draft}
      onAccept={onAccept}
      onChange={onChange}
      subjectLinkRef={subjectLinkRef}
    />
  );
}

export function ReviewQueue({
  currentAgentId,
}: ReviewQueueProps = {}) {
  const countsBootstrapped = useAppSelector(selectCountsBootstrapped);
  const {
    tickets,
    remainingCount,
    accept,
    change,
    feedback,
    drafts,
    itemErrors,
  } = useReviewQueue({
    currentAgentId,
  });

  const headingRef = useRef<HTMLHeadingElement>(null);
  const subjectLinkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  // Track the ID of the last ticket acted upon to shift focus smoothly
  const lastActionIdRef = useRef<string | null>(null);
  const previousVisibleIdsRef = useRef<string[]>(tickets.map((t) => t.id));

  const handleAccept = (ticketId: string) => {
    lastActionIdRef.current = ticketId;
    accept(ticketId);
  };

  const handleChange = (
    ticketId: string,
    input: { category: Category; priority: Priority; reason: string }
  ) => {
    lastActionIdRef.current = ticketId;
    change(ticketId, input);
  };

  // Focus management after item removal
  useEffect(() => {
    const prevIds = previousVisibleIdsRef.current;
    const currentIds = tickets.map((t) => t.id);
    previousVisibleIdsRef.current = currentIds;

    const actionId = lastActionIdRef.current;
    if (!actionId) return;

    // Check if the acted upon ticket was removed
    if (prevIds.includes(actionId) && !currentIds.includes(actionId)) {
      lastActionIdRef.current = null;

      if (currentIds.length === 0) {
        // Queue is now empty: focus heading
        headingRef.current?.focus();
      } else {
        // Focus the next row that took its place (or previous if it was the last)
        const removedIndex = prevIds.indexOf(actionId);
        const nextId =
          currentIds[removedIndex] ?? currentIds[currentIds.length - 1];
        if (nextId && subjectLinkRefs.current[nextId]) {
          subjectLinkRefs.current[nextId]?.focus();
        }
      }
    }
  }, [tickets]);

  if (!countsBootstrapped) {
    return (
      <div className="space-y-6 max-w-[1400px]">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 break-words">
            AI review queue
          </h1>
          <p className="text-sm text-slate-600">
            Tickets where the AI asked for a human check.
          </p>
          <p
            role="status"
            aria-live="polite"
            className="text-xs text-slate-500 font-medium pt-1"
          >
            Loading review queue…
          </p>
        </div>
        <div className="rounded-[6px] border border-slate-200 bg-white p-12 text-center text-slate-500 text-sm">
          Loading review queue…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header with Title and Live Status Count */}
      <div className="space-y-1">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-xl sm:text-2xl font-semibold text-slate-900 break-words focus:outline-none"
        >
          AI review queue
        </h1>
        <p className="text-sm text-slate-600">
          Tickets where the AI asked for a human check.
        </p>
        <p
          role="status"
          aria-live="polite"
          className="text-xs text-slate-500 font-medium pt-1"
        >
          {remainingCount === 1
            ? "1 ticket needs review"
            : `${remainingCount} tickets need review`}
        </p>
      </div>

      {/* Page-level feedback announcement region */}
      {feedback && (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          aria-live={feedback.kind === "error" ? "assertive" : "polite"}
          className={`p-3.5 rounded-[6px] text-xs sm:text-sm border break-words ${
            feedback.kind === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Queue or Empty State */}
      {remainingCount === 0 ? (
        <div className="rounded-[6px] border border-slate-200 bg-white p-12 text-center space-y-3">
          <h3 className="text-base font-medium text-slate-900">
            No tickets need review
          </h3>
          <p className="text-sm text-slate-500">
            All tickets in the review queue have been processed.
          </p>
          <div className="pt-2">
            <Link
              href="/tickets"
              className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-[6px] bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 transition-colors focus-visible:outline-2 focus-visible:outline-sky-500 focus-visible:outline-offset-2"
            >
              Back to tickets
            </Link>
          </div>
        </div>
      ) : (
        <ul className="rounded-[6px] border border-slate-200 bg-white divide-y divide-slate-200 overflow-hidden">
          {tickets.map((ticket) => (
            <ReviewItemRow
              key={ticket.id}
              ticket={ticket}
              draft={drafts[ticket.id] ?? null}
              error={itemErrors[ticket.id] ?? null}
              onAccept={handleAccept}
              onChange={handleChange}
              subjectLinkRef={(el) => {
                subjectLinkRefs.current[ticket.id] = el;
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
