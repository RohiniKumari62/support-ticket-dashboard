"use client";

import Link from "next/link";
import type { Ticket } from "@/types/ticket";
import type { TicketsApiClient } from "@/lib/api/tickets-client";
import { PriorityBadge } from "@/components/tickets/PriorityBadge";
import { StatusBadge } from "@/components/tickets/StatusBadge";
import { useTicketActions } from "./useTicketActions";
import { TicketBody } from "./TicketBody";
import { TicketAttachment } from "./TicketAttachment";
import { TicketAiSection } from "./TicketAiSection";
import { TicketActions } from "./TicketActions";
import { TicketDetailsSummary } from "./TicketDetailsSummary";
import { useAppSelector } from "@/lib/store/hooks";
import {
  selectCurrentAgentId,
  selectFilters,
  selectTicketById,
} from "@/lib/store/tickets-selectors";
import {
  hasActiveFilters,
  serializeTicketFilters,
} from "@/lib/tickets/filters";

export interface TicketDetailProps {
  ticket?: Ticket;
  ticketId?: string;
  currentAgentId?: string;
  api?: TicketsApiClient;
}

export function TicketDetail({
  ticket: initialTicket,
  ticketId: propTicketId,
  currentAgentId: propCurrentAgentId,
  api,
}: TicketDetailProps) {
  const storeAgentId = useAppSelector(selectCurrentAgentId);
  const currentAgentId = propCurrentAgentId ?? storeAgentId;

  const id = propTicketId ?? initialTicket?.id ?? "";
  const storeTicket = useAppSelector((state) => selectTicketById(state, id));
  const effectiveTicket = storeTicket ?? initialTicket;

  const filters = useAppSelector(selectFilters);
  const backHref =
    hasActiveFilters(filters)
      ? `/tickets?${serializeTicketFilters(filters)}`
      : "/tickets";

  const {
    ticket,
    pendingAction,
    feedback,
    handleClaim,
    handleStatusChange,
    handleRetriage,
  } = useTicketActions({
    initialTicket: effectiveTicket ?? undefined,
    ticketId: id,
    currentAgentId,
    api,
  });

  if (!ticket || !ticket.id) {
    return (
      <div className="rounded-[6px] border border-slate-200 bg-white p-8 text-center space-y-3 max-w-[600px] mx-auto">
        <h2 className="text-base font-semibold text-slate-900">Ticket not found</h2>
        <p className="text-sm text-slate-500">
          The requested ticket does not exist or has been removed.
        </p>
        <div>
          <Link
            href="/tickets"
            className="inline-flex items-center min-h-[40px] px-3 rounded-[6px] text-sm font-medium bg-sky-500 text-white hover:bg-sky-600 transition-colors focus-visible:outline-2 focus-visible:outline-sky-500 focus-visible:outline-offset-2 select-none"
          >
            ← Back to tickets
          </Link>
        </div>
      </div>
    );
  }

  const hasSubject = Boolean(ticket.subject && ticket.subject.trim().length > 0);

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Top Header */}
      <div className="space-y-3">
        <Link
          href={backHref}
          className="inline-flex items-center min-h-[40px] px-3 rounded-[6px] text-sm font-medium bg-sky-500 text-white hover:bg-sky-600 transition-colors focus-visible:outline-2 focus-visible:outline-sky-500 focus-visible:outline-offset-2 select-none"
        >
          ← Back to tickets
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <h1
              dir="auto"
              className="text-xl sm:text-2xl font-semibold text-slate-900 break-words [unicode-bidi:plaintext]"
            >
              {hasSubject ? (
                ticket.subject
              ) : (
                <span className="italic text-slate-500">(No subject)</span>
              )}
            </h1>

            <div className="flex items-center gap-2.5 flex-wrap pt-1">
              <span className="font-mono text-xs text-slate-500 font-medium">
                {ticket.id}
              </span>
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
              {pendingAction && (
                <span className="text-xs text-slate-500 italic">Saving…</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      {/* On mobile (below lg): actions and details appear directly below header (order-1), so actions are reachable without scrolling far. */}
      {/* On desktop (lg+): 2 columns, main content on left (col-span-2) and actions + details in side column (col-span-1). */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        {/* Main column: Description, Attachment, AI Triage */}
        <div className="order-2 lg:order-1 lg:col-span-2 space-y-6">
          <TicketBody body={ticket.body} />
          <TicketAttachment
            attachmentUrl={ticket.attachmentUrl}
            dataIssues={ticket.dataIssues}
          />
          <TicketAiSection ticket={ticket} />
        </div>

        {/* Side column: Actions & Details */}
        <div className="order-1 lg:order-2 lg:col-span-1 space-y-6">
          <TicketActions
            ticket={ticket}
            currentAgentId={currentAgentId}
            pendingAction={pendingAction}
            feedback={feedback}
            onClaim={handleClaim}
            onStatusChange={handleStatusChange}
            onRetriage={handleRetriage}
          />
          <TicketDetailsSummary ticket={ticket} />
        </div>
      </div>
    </div>
  );
}
