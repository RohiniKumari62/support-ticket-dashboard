import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Review queue",
};

export default function ReviewPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 break-words">
          AI review queue
        </h1>
        <p className="text-sm text-slate-600">
          Tickets where the AI asked for a human check.
        </p>
      </div>

      {/* TODO(phase-5): Implement AI review queue interface, diff view, and human decision actions */}
      <div className="rounded-[6px] border border-slate-200 bg-white p-6 text-sm text-slate-600">
        AI review queue arrives in Phase 5.
      </div>
    </div>
  );
}
