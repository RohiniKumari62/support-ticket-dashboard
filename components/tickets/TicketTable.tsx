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

interface TicketTableProps {
  tickets: Ticket[];
}

export function TicketTable({ tickets }: TicketTableProps) {
  return (
    <div className="hidden md:block w-full overflow-x-auto rounded-[6px] border border-slate-200 bg-white">
      <table className="w-full text-left text-sm border-collapse">
        <caption className="sr-only">Customer support tickets list</caption>
        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
          <tr>
            <th scope="col" className="py-2.5 px-3 min-w-[260px]">
              Subject
            </th>
            <th scope="col" className="py-2.5 px-3 whitespace-nowrap">
              Plan
            </th>
            <th scope="col" className="py-2.5 px-3 whitespace-nowrap">
              Category
            </th>
            <th scope="col" className="py-2.5 px-3 whitespace-nowrap">
              Priority
            </th>
            <th scope="col" className="py-2.5 px-3 whitespace-nowrap">
              Status
            </th>
            <th scope="col" className="py-2.5 px-3 whitespace-nowrap">
              Agent
            </th>
            <th scope="col" className="py-2.5 px-3 whitespace-nowrap">
              Created
            </th>
            <th scope="col" className="py-2.5 px-3 whitespace-nowrap">
              Deadline
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {tickets.map((ticket) => {
            // TODO(phase-7): Implement live countdown and late/at-risk/on-track deadline logic
            const deadline = getDeadline(ticket.createdAt, ticket.priority);
            const agentName = getAgentName(ticket.assignedTo);
            const hasIssues = ticket.dataIssues.length > 0;

            return (
              <tr
                key={ticket.id}
                className="hover:bg-slate-50/80 transition-colors h-[44px]"
              >
                {/* Subject */}
                <td className="py-2 px-3 min-w-0 max-w-[340px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Link
                      href={`/tickets/${encodeURIComponent(ticket.id)}`}
                      className="font-medium text-slate-900 hover:text-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 truncate"
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
                        className="inline-flex items-center text-[10px] text-amber-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 shrink-0 select-none"
                        title={`Data issues: ${ticket.dataIssues.join(", ")}`}
                      >
                        Data issue
                      </span>
                    )}
                  </div>
                </td>

                {/* Plan */}
                <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                  <span
                    className={
                      ticket.plan ? "text-slate-700" : "text-slate-400 italic"
                    }
                  >
                    {getPlanLabel(ticket.plan)}
                  </span>
                </td>

                {/* Category */}
                <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                  <span
                    className={
                      ticket.category
                        ? "text-slate-700"
                        : "text-slate-400 italic"
                    }
                  >
                    {getCategoryLabel(ticket.category)}
                  </span>
                </td>

                {/* Priority */}
                <td className="py-2 px-3 whitespace-nowrap">
                  <PriorityBadge priority={ticket.priority} />
                </td>

                {/* Status */}
                <td className="py-2 px-3 whitespace-nowrap">
                  <StatusBadge status={ticket.status} />
                </td>

                {/* Agent */}
                <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                  {agentName ? (
                    <span className="text-slate-900 font-medium">
                      {agentName}
                    </span>
                  ) : ticket.assignedToUnknown ? (
                    <span
                      className="text-slate-500 italic"
                      title={ticket.assignedToUnknown}
                    >
                      Unknown agent
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Unassigned</span>
                  )}
                </td>

                {/* Created */}
                <td
                  className="py-2 px-3 whitespace-nowrap text-xs text-slate-500 tabular"
                  title={formatDateTimeFull(ticket.createdAt) || undefined}
                >
                  {formatDateTime(ticket.createdAt)}
                </td>

                {/* Deadline */}
                <td
                  className="py-2 px-3 whitespace-nowrap text-xs text-slate-500 tabular"
                  title={formatDateTimeFull(deadline) || undefined}
                >
                  {formatDateTime(deadline)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
