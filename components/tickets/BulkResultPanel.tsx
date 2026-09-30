"use client";

import type { BulkActionKind, BulkTicketResult } from "@/lib/tickets/bulk";
import { Button } from "@/components/ui/button";

export interface BulkResultPanelProps {
  actionKind: BulkActionKind;
  results: BulkTicketResult[];
  onRetryFailed: () => void;
  onDismiss: () => void;
  isRetrying?: boolean;
}

export function BulkResultPanel({
  actionKind,
  results,
  onRetryFailed,
  onDismiss,
  isRetrying = false,
}: BulkResultPanelProps) {
  if (results.length === 0) {
    return null;
  }

  const doneCount = results.filter((r) => r.outcome === "success").length;
  const failedCount = results.filter((r) => r.outcome === "failed").length;
  const skippedCount = results.filter((r) => r.outcome === "skipped").length;

  const hasFailures = failedCount > 0;
  const role = hasFailures ? "alert" : "status";

  const actionTitle = actionKind === "claim" ? "Bulk claim" : "Bulk status update";

  return (
    <div
      role={role}
      className={`rounded-[6px] border p-4 space-y-3 ${
        hasFailures
          ? "border-amber-300 bg-amber-50/50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      {/* Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-slate-900">
            {actionTitle}: {doneCount} done, {failedCount} failed, {skippedCount} skipped
          </h3>
          <p className="text-xs text-slate-600">
            {hasFailures
              ? "Some tickets could not be updated. Review the results below."
              : "All requested updates completed."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasFailures && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetryFailed}
              disabled={isRetrying}
              className="text-xs"
            >
              Retry failed ({failedCount})
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            disabled={isRetrying}
            className="text-xs text-slate-600"
          >
            Dismiss
          </Button>
        </div>
      </div>

      {/* Scrollable Result Item List */}
      <div className="max-h-52 overflow-y-auto rounded border border-slate-200 bg-white divide-y divide-slate-100">
        <ul role="list" className="divide-y divide-slate-100">
          {results.map((r) => (
            <li
              key={r.ticketId}
              className="px-3 py-2 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-mono text-slate-500 font-medium shrink-0">
                  {r.ticketId}
                </span>
                <span
                  dir="auto"
                  className="text-slate-900 truncate font-normal [unicode-bidi:plaintext]"
                  title={(r.subject || "(No subject)").slice(0, 200)}
                >
                  {r.subject || "(No subject)"}
                </span>
              </div>

              <div className="shrink-0 flex items-center">
                {r.outcome === "success" && (
                  <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 font-medium">
                    {r.message}
                  </span>
                )}
                {r.outcome === "failed" && (
                  <span
                    className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 font-medium"
                    title={r.message}
                  >
                    Failed: {r.message}
                  </span>
                )}
                {r.outcome === "skipped" && (
                  <span
                    className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                    title={r.message}
                  >
                    Skipped: {r.message}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
