import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTicketById } from "@/lib/tickets/data";
import { CURRENT_AGENT_ID } from "@/lib/agents/current-agent";
import { TicketDetail } from "@/components/tickets/detail/TicketDetail";

export const metadata: Metadata = {
  title: "Ticket Details",
};

interface TicketDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({
  params,
}: TicketDetailPageProps) {
  const { id: rawId } = await params;

  let decodedId: string;
  try {
    decodedId = decodeURIComponent(rawId);
  } catch {
    notFound();
  }

  // Cap length at 64 characters to reject malformed or unbounded paths
  if (!decodedId || decodedId.length > 64) {
    notFound();
  }

  const ticket = getTicketById(decodedId);
  if (!ticket) {
    notFound();
  }

  return (
    <TicketDetail ticket={ticket} currentAgentId={CURRENT_AGENT_ID} />
  );
}
