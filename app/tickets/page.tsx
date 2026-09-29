import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tickets",
};

export default function TicketsPage() {
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

      {/* TODO(phase-2): Implement ticket list table, search, filters, and pagination */}
      <div className="rounded-[6px] border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Ticket list arrives in Phase 2.
      </div>
    </div>
  );
}
