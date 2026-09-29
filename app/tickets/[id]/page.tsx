import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ticket",
};

interface TicketDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({
  params,
}: TicketDetailPageProps) {
  const { id } = await params;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/tickets"
          className="inline-flex items-center min-h-[40px] text-sm text-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          ← Back to tickets
        </Link>
        <h1 className="text-xl font-semibold text-slate-900 break-words">
          Ticket {id}
        </h1>
        <p className="text-sm text-slate-600">
          Ticket details and conversation history.
        </p>
      </div>

      {/* TODO(phase-4): Implement ticket details view, conversation thread, and actions */}
      <div className="rounded-[6px] border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Ticket details arrive in Phase 4.
      </div>
    </div>
  );
}
