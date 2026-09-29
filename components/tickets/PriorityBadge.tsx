import type { Priority } from "@/types/ticket";
import { getPriorityLabel } from "@/lib/tickets/labels";

interface PriorityBadgeProps {
  priority: Priority | null;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const label = getPriorityLabel(priority);

  if (!priority) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 tabular">
        {label}
      </span>
    );
  }

  // Restrained semantic styles per DESIGN.md
  // P0: Slightly stronger emphasis (red tint)
  // P1: Amber tint
  // P2, P3: Neutral slate tint
  const styles: Record<Priority, string> = {
    P0: "bg-red-50 text-red-700 border-red-200 font-semibold",
    P1: "bg-amber-50 text-amber-800 border-amber-200",
    P2: "bg-slate-100 text-slate-700 border-slate-200",
    P3: "bg-slate-50 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border tabular ${styles[priority]}`}
    >
      {label}
    </span>
  );
}
