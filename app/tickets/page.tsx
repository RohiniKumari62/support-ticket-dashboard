import type { Metadata } from "next";
import { RAW_TICKETS } from "@/data/mock-tickets";
import { normalizeTickets } from "@/lib/tickets/normalize";
import { sortTickets } from "@/lib/tickets/sort";
import { filterTickets, hasActiveFilters, parseTicketFilters } from "@/lib/tickets/filters";
import { TicketFilters } from "@/components/tickets/TicketFilters";
import { TicketList } from "@/components/tickets/TicketList";

export const metadata: Metadata = {
  title: "Tickets",
};

interface TicketsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const params = await searchParams;
  const filters = parseTicketFilters(params);

  const { tickets, duplicatesRemoved } = normalizeTickets(RAW_TICKETS, new Date());
  const sortedTickets = sortTickets(tickets);
  const filteredTickets = filterTickets(sortedTickets, filters);

  const filtersActive = hasActiveFilters(filters);

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

      <TicketFilters
        filters={filters}
        totalCount={sortedTickets.length}
        resultCount={filteredTickets.length}
      />

      <TicketList
        tickets={filteredTickets}
        duplicatesRemoved={duplicatesRemoved}
        hasActiveFilters={filtersActive}
      />
    </div>
  );
}
