import type { Ticket } from "@/types/ticket";
import { getAgentName } from "@/data/agents";
import { formatDataIssues, getCategoryLabel, getPlanLabel } from "@/lib/tickets/labels";
import { formatDateTime, formatDateTimeFull, getDeadline } from "@/lib/tickets/time";

interface TicketDetailsSummaryProps {
  ticket: Ticket;
}

export function TicketDetailsSummary({ ticket }: TicketDetailsSummaryProps) {
  // Static deadline calculation. Dynamic countdown and at-risk styling arrive in Phase 7.
  const deadlineIso = getDeadline(ticket.createdAt, ticket.priority);

  return (
    <div className="rounded-[6px] border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Ticket Details</h2>

      <dl className="space-y-3 text-sm">
        <div className="flex justify-between items-baseline gap-2">
          <dt className="text-xs text-slate-500 font-medium">Customer</dt>
          <dd className="text-slate-900 font-mono text-xs">{ticket.customerId || "—"}</dd>
        </div>

        <div className="flex justify-between items-baseline gap-2">
          <dt className="text-xs text-slate-500 font-medium">Plan</dt>
          <dd className="text-slate-900 text-xs">{getPlanLabel(ticket.plan)}</dd>
        </div>

        <div className="flex justify-between items-baseline gap-2">
          <dt className="text-xs text-slate-500 font-medium">Category</dt>
          <dd className="text-slate-900 text-xs">{getCategoryLabel(ticket.category)}</dd>
        </div>

        <div className="flex justify-between items-baseline gap-2">
          <dt className="text-xs text-slate-500 font-medium">Assigned Agent</dt>
          <dd className="text-slate-900 text-xs">
            {ticket.assignedTo ? (
              getAgentName(ticket.assignedTo) ?? ticket.assignedTo
            ) : ticket.assignedToUnknown ? (
              <span
                className="text-amber-800"
                title={ticket.assignedToUnknown}
              >
                Unknown agent
              </span>
            ) : (
              <span className="text-slate-500 italic">Unassigned</span>
            )}
          </dd>
        </div>

        <div className="flex justify-between items-baseline gap-2">
          <dt className="text-xs text-slate-500 font-medium">Created</dt>
          <dd
            className="text-slate-900 text-xs tabular-nums"
            title={formatDateTimeFull(ticket.createdAt)}
          >
            {formatDateTime(ticket.createdAt)}
          </dd>
        </div>

        <div className="flex justify-between items-baseline gap-2">
          <dt className="text-xs text-slate-500 font-medium">Deadline</dt>
          <dd
            className="text-slate-900 text-xs tabular-nums"
            title={formatDateTimeFull(deadlineIso)}
          >
            {formatDateTime(deadlineIso)}
          </dd>
        </div>
      </dl>

      {/* Subtle data issues note */}
      {ticket.dataIssues && ticket.dataIssues.length > 0 && (
        <div
          role="note"
          className="rounded-[4px] border border-amber-200 bg-amber-50/60 p-2.5 text-xs text-amber-900"
        >
          {formatDataIssues(ticket.dataIssues)}
        </div>
      )}
    </div>
  );
}
