"use client";

import { useState } from "react";
import type { TicketStatus } from "@/types/ticket";
import { Button } from "@/components/ui/button";

export interface BulkActionBarProps {
  selectedCount: number;
  isRunning: boolean;
  progress: { done: number; total: number };
  onClaim: () => void;
  onStatusApply: (status: TicketStatus) => void;
  onClear: () => void;
}

const BULK_STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "in_progress", label: "Start progress" },
  { value: "resolved", label: "Mark resolved" },
  { value: "open", label: "Reopen" },
];

export function BulkActionBar({
  selectedCount,
  isRunning,
  progress,
  onClaim,
  onStatusApply,
  onClear,
}: BulkActionBarProps) {
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>("in_progress");

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      {/* Desktop Inline Bar (≥ md) */}
      <div
        role="region"
        aria-label="Bulk actions"
        className="hidden md:flex items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-200 rounded-[6px] text-sm"
      >
        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-900 tabular">
            {selectedCount} selected
          </span>
          {isRunning && (
            <span
              role="status"
              className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-medium tabular"
            >
              Working… {progress.done}/{progress.total}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClaim}
            disabled={isRunning}
          >
            Claim
          </Button>

          <div className="flex items-center gap-1.5">
            <label htmlFor="bulk-status-select-desktop" className="sr-only">
              Bulk change status
            </label>
            <select
              id="bulk-status-select-desktop"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as TicketStatus)}
              disabled={isRunning}
              className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-900 cursor-pointer disabled:opacity-50"
            >
              {BULK_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onStatusApply(selectedStatus)}
              disabled={isRunning}
            >
              Apply
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={isRunning}
            className="text-slate-600 hover:text-slate-900 text-xs"
          >
            Clear selection
          </Button>
        </div>
      </div>

      {/* Mobile Fixed Bottom Bar (< md) */}
      <div
        role="region"
        aria-label="Bulk actions"
        className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t border-slate-200 p-3 shadow-lg flex flex-col gap-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-xs text-slate-900 tabular">
            {selectedCount} selected
          </span>
          {isRunning ? (
            <span
              role="status"
              className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-medium tabular"
            >
              Working… {progress.done}/{progress.total}
            </span>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-xs text-slate-600 h-8 px-2"
            >
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClaim}
            disabled={isRunning}
            className="flex-1 min-h-[44px]"
          >
            Claim
          </Button>

          <div className="flex items-center gap-1 flex-1">
            <label htmlFor="bulk-status-select-mobile" className="sr-only">
              Bulk change status
            </label>
            <select
              id="bulk-status-select-mobile"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as TicketStatus)}
              disabled={isRunning}
              className="h-[44px] flex-1 rounded border border-slate-200 bg-white px-2 text-xs text-slate-900 cursor-pointer disabled:opacity-50 min-w-0"
            >
              {BULK_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onStatusApply(selectedStatus)}
              disabled={isRunning}
              className="min-h-[44px]"
            >
              Apply
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
