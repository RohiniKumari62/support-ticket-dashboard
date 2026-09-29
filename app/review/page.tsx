import type { Metadata } from "next";
import { getNormalizedTickets } from "@/lib/tickets/data";
import { getReviewQueue } from "@/lib/tickets/review";
import { CURRENT_AGENT_ID } from "@/lib/agents/current-agent";
import { ReviewQueue } from "@/components/review/ReviewQueue";

export const metadata: Metadata = {
  title: "Review queue",
};

export default function ReviewPage() {
  const allTickets = getNormalizedTickets();
  const queueTickets = getReviewQueue(allTickets);

  return (
    <ReviewQueue tickets={queueTickets} currentAgentId={CURRENT_AGENT_ID} />
  );
}
