import Link from "next/link";
import type { Ticket } from "@/types/ticket";
import { TicketTable } from "./TicketTable";
import { TicketListItem } from "./TicketListItem";
import { EmptyTickets } from "./EmptyTickets";

interface TicketListProps {
  tickets: Ticket[];
  duplicatesRemoved?: number;
  /** True when at least one filter or search is active (changes the empty state) */
  hasActiveFilters?: boolean;
}

export function TicketList({
  tickets,
  duplicatesRemoved = 0,
  hasActiveFilters = false,
}: TicketListProps) {
  if (tickets.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="rounded-[6px] border border-slate-200 bg-white p-12 text-center">
          <h3 className="text-base font-medium text-slate-900">
            No tickets match your filters
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Try adjusting your search or filter criteria.
          </p>
          <div className="mt-4">
            <Link
              href="/tickets"
              className="inline-flex items-center justify-center h-10 px-4 rounded border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors"
            >
              Clear filters
            </Link>
          </div>
        </div>
      );
    }
    return <EmptyTickets />;
  }

  return (
    <div className="space-y-2">
      {/* Duplicate notice */}
      {duplicatesRemoved > 0 && (
        <div className="px-0.5">
          <span className="text-xs text-slate-400 italic">
            {duplicatesRemoved}{" "}
            {duplicatesRemoved === 1 ? "duplicate ticket" : "duplicate tickets"}{" "}
            ignored
          </span>
        </div>
      )}

      {/* Desktop Table (≥ md) */}
      <TicketTable tickets={tickets} />

      {/* Mobile Stacked List (< md) */}
      <div className="block md:hidden rounded-[6px] border border-slate-200 bg-white overflow-hidden">
        <ul role="list" className="divide-y divide-slate-200">
          {tickets.map((ticket) => (
            <TicketListItem key={ticket.id} ticket={ticket} />
          ))}
        </ul>
      </div>
    </div>
  );
}
