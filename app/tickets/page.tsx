import type { Metadata } from "next";
import { RAW_TICKETS } from "@/data/mock-tickets";
import { normalizeTickets } from "@/lib/tickets/normalize";
import { sortTickets } from "@/lib/tickets/sort";
import { TicketList } from "@/components/tickets/TicketList";

export const metadata: Metadata = {
  title: "Tickets",
};

export default function TicketsPage() {
  const { tickets, duplicatesRemoved } = normalizeTickets(
    RAW_TICKETS,
    new Date()
  );
  const sortedTickets = sortTickets(tickets);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 break-words">
          Tickets
        </h1>
        <p className="text-sm text-slate-600">
          Find, triage, and manage customer support tickets.
        </p>
      </div>

      <TicketList
        tickets={sortedTickets}
        duplicatesRemoved={duplicatesRemoved}
      />
    </div>
  );
}
