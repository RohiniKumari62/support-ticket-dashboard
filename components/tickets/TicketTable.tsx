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

export interface TicketTableProps {
  tickets: Ticket[];
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
}

interface TicketRowProps {
  ticket: Ticket;
  isSelected: boolean;
  onToggle?: (id: string) => void;
}

const TicketTableRow = React.memo(function TicketTableRow({
  ticket,
  isSelected,
  onToggle,
}: TicketRowProps) {
  const isUpdating = useAppSelector(
    (state) => Boolean(selectInFlightAction(state, ticket.id))
  );

  const agentName = getAgentName(ticket.assignedTo);
  const hasIssues = ticket.dataIssues.length > 0;

  return (
    <tr
      className={`hover:bg-slate-50/80 transition-colors h-[44px] ${
        isSelected ? "bg-blue-50/40" : ""
      }`}
    >
      {/* Selection checkbox */}
      <td className="py-2 px-3 w-10 text-center">
        {onToggle && (
          <input
            type="checkbox"
            aria-label={`Select ${ticket.id}`}
            checked={isSelected}
            onChange={() => onToggle(ticket.id)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4 align-middle"
          />
        )}
      </td>

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
          {isUpdating && (
            <span className="text-[11px] text-slate-400 italic shrink-0 select-none">
              Updating…
            </span>
          )}
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
      <td className="py-2 px-3 whitespace-nowrap min-w-[130px]">
        <DeadlineCell ticket={ticket} />
      </td>
    </tr>
  );
});

export function TicketTable({
  tickets,
  selectedIds,
  onToggle,
  onSelectAll,
  isAllSelected = false,
  isIndeterminate = false,
}: TicketTableProps) {
  return (
    <div className="hidden md:block w-full overflow-x-auto rounded-[6px] border border-slate-200 bg-white">
      <table className="w-full text-left text-sm border-collapse">
        <caption className="sr-only">Customer support tickets list</caption>
        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
          <tr>
            <th scope="col" className="py-2.5 px-3 w-10 text-center">
              {onSelectAll && (
                <input
                  type="checkbox"
                  aria-label="Select all visible tickets"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  onChange={onSelectAll}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4 align-middle"
                />
              )}
            </th>
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
          {tickets.map((ticket) => (
            <TicketTableRow
              key={ticket.id}
              ticket={ticket}
              isSelected={selectedIds?.has(ticket.id) ?? false}
              onToggle={onToggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
