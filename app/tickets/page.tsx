import type { Metadata } from "next";
import { parseTicketFilters } from "@/lib/tickets/filters";
import { TicketsWorkspace } from "@/components/tickets/TicketsWorkspace";

export const metadata: Metadata = {
  title: "Tickets",
};

interface TicketsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const params = await searchParams;
  const filters = parseTicketFilters(params);

  return <TicketsWorkspace filters={filters} />;
}
