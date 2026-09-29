import type { TicketStatus } from "@/types/ticket";
import { getStatusLabel } from "@/lib/tickets/labels";

interface StatusBadgeProps {
  status: TicketStatus | null;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = getStatusLabel(status);

  if (!status) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        {label}
      </span>
    );
  }

  // Restrained semantic styles per DESIGN.md
  // open: blue tint
  // in_progress: amber tint
  // resolved: green tint
  // closed: slate neutral
  const styles: Record<TicketStatus, string> = {
    open: "bg-blue-50 text-blue-700 border-blue-200",
    in_progress: "bg-amber-50 text-amber-800 border-amber-200",
    resolved: "bg-emerald-50 text-emerald-800 border-emerald-200",
    closed: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[status]}`}
    >
      {label}
    </span>
  );
}
