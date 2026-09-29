import Link from "next/link";
import type { Ticket } from "@/types/ticket";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import { getPlanLabel, getCategoryLabel } from "@/lib/tickets/labels";
import { getAgentName } from "@/data/agents";
import {
  formatDateTime,
  formatDateTimeFull,
  getDeadline,
} from "@/lib/tickets/time";

interface TicketListItemProps {
  ticket: Ticket;
}

export function TicketListItem({ ticket }: TicketListItemProps) {
  // TODO(phase-7): Implement live countdown and late/at-risk/on-track deadline logic
  const deadline = getDeadline(ticket.createdAt, ticket.priority);
  const agentName = getAgentName(ticket.assignedTo);
  const hasIssues = ticket.dataIssues.length > 0;

  return (
    <li className="py-3 px-3 hover:bg-slate-50/80 transition-colors">
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
        {hasIssues && (
          <span
            className="inline-flex items-center text-[10px] text-amber-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 shrink-0 select-none mt-2"
            title={`Data issues: ${ticket.dataIssues.join(", ")}`}
          >
            Data issue
          </span>
        )}
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
        <div
          className="tabular"
          title={formatDateTimeFull(deadline) || undefined}
        >
          <span className="text-slate-400">Deadline: </span>
          {formatDateTime(deadline)}
        </div>
      </div>
    </li>
  );
}
