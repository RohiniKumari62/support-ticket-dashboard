"use client";

import { useAppSelector } from "@/lib/store/hooks";
import {
  selectAgentHydrated,
  selectMyTicketsCount,
} from "@/lib/store/tickets-selectors";

export function HeaderCounts() {
  const isHydrated = useAppSelector(selectAgentHydrated);
  const myTicketsCount = useAppSelector(selectMyTicketsCount);

  return (
    <span
      className="inline-flex items-center h-10 text-sm text-[oklch(0.44_0.019_264.4)] whitespace-nowrap tabular"
      aria-label={`My tickets count: ${isHydrated ? myTicketsCount : "loading"}`}
    >
      My tickets ({isHydrated ? myTicketsCount : "–"})
    </span>
  );
}
