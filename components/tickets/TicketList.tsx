import type { Ticket } from "@/types/ticket";
import { TicketTable } from "./TicketTable";
import { TicketListItem } from "./TicketListItem";
import { EmptyTickets } from "./EmptyTickets";

interface TicketListProps {
  tickets: Ticket[];
  duplicatesRemoved?: number;
}

export function TicketList({
  tickets,
  duplicatesRemoved = 0,
}: TicketListProps) {
  if (tickets.length === 0) {
    return <EmptyTickets />;
  }

  return (
    <div className="space-y-2">
      {/* Count & duplicate notice header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 px-0.5">
        <span className="tabular">
          Showing {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
        </span>
        {duplicatesRemoved > 0 && (
          <span className="text-slate-400 italic">
            {duplicatesRemoved}{" "}
            {duplicatesRemoved === 1 ? "duplicate ticket" : "duplicate tickets"}{" "}
            ignored
          </span>
        )}
      </div>

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
