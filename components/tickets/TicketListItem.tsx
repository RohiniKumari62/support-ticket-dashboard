"use client";

import React from "react";
import Link from "next/link";
import type { Ticket } from "@/types/ticket";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import { DeadlineCell } from "./DeadlineCell";
import { getPlanLabel, getCategoryLabel } from "@/lib/tickets/labels";
import { getAgentName } from "@/data/agents";
import { formatDateTime, formatDateTimeFull } from "@/lib/tickets/time";
import { useAppSelector } from "@/lib/store/hooks";
import { selectInFlightAction } from "@/lib/store/tickets-selectors";

export interface TicketListItemProps {
  ticket: Ticket;
  isSelected?: boolean;
  onToggle?: (id: string) => void;
}

export const TicketListItem = React.memo(function TicketListItem({
  ticket,
  isSelected = false,
  onToggle,
}: TicketListItemProps) {
  const isUpdating = useAppSelector(
    (state) => Boolean(selectInFlightAction(state, ticket.id))
  );

  const agentName = getAgentName(ticket.assignedTo);
  const hasIssues = ticket.dataIssues.length > 0;

  return (
    <li
      className={`py-3 px-3 hover:bg-slate-50/80 transition-colors ${
        isSelected ? "bg-blue-50/40" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Mobile Checkbox (touch target >= 44px) */}
        {onToggle && (
          <div className="flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 -mt-1 shrink-0">
            <input
              type="checkbox"
              aria-label={`Select ${ticket.id}`}
              checked={isSelected}
              onChange={() => onToggle(ticket.id)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-5 w-5"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Row 1: Subject + optional data issue */}
          <div className="flex items-start justify-between gap-2 min-w-0">
            <Link
              href={`/tickets/${encodeURIComponent(ticket.id)}`}
              className="font-medium text-sm text-slate-900 hover:text-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[40px] flex items-center line-clamp-2 break-all"
              dir="auto"
              title={ticket.subject || "(No subject)"}
            >
              {ticket.subject ? (
                ticket.subject
              ) : (
                <span className="italic text-slate-400 font-normal">
                  (No subject)
                </span>
              )}
            </Link>
            <div className="flex items-center gap-1 shrink-0 mt-2">
              {isUpdating && (
                <span className="text-[11px] text-slate-400 italic select-none">
                  Updating…
                </span>
              )}
              {hasIssues && (
                <span
                  className="inline-flex items-center text-[10px] text-amber-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 select-none"
                  title={`Data issues: ${ticket.dataIssues.join(", ")}`}
                >
                  Data issue
                </span>
              )}
            </div>
          </div>

          {/* Row 2: Badges (Priority, Status) + Plan / Category */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
            <span className="text-slate-300">·</span>
            <span
              className={ticket.plan ? "text-slate-700" : "text-slate-400 italic"}
            >
              {getPlanLabel(ticket.plan)}
            </span>
            <span className="text-slate-300">·</span>
            <span
              className={
                ticket.category ? "text-slate-700" : "text-slate-400 italic"
              }
            >
              {getCategoryLabel(ticket.category)}
            </span>
          </div>

          {/* Row 3: Agent, Created, Deadline */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <div>
              <span className="text-slate-400">Agent: </span>
              {agentName ? (
                <span className="text-slate-800 font-medium">{agentName}</span>
              ) : ticket.assignedToUnknown ? (
                <span
                  className="italic text-slate-500"
                  title={ticket.assignedToUnknown}
                >
                  Unknown agent
                </span>
              ) : (
                <span className="italic text-slate-400">Unassigned</span>
              )}
            </div>
            <div
              className="tabular"
              title={formatDateTimeFull(ticket.createdAt) || undefined}
            >
              <span className="text-slate-400">Created: </span>
              {formatDateTime(ticket.createdAt)}
            </div>
            <div>
              <span className="text-slate-400">Deadline: </span>
              <div className="inline-block align-top">
                <DeadlineCell ticket={ticket} showStaticTime={false} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
});
