"use client";

import type { Ticket } from "@/types/ticket";
import { formatDateTime, formatDateTimeFull } from "@/lib/tickets/time";
import {
  formatCountdown,
  getDeadlineInfo,
  type DeadlineState,
} from "@/lib/tickets/deadline";
import { useNow } from "@/lib/tickets/ticker";

export interface DeadlineCellProps {
  ticket: Ticket;
  showStaticTime?: boolean;
}

function getStatusBadge(state: DeadlineState) {
  switch (state) {
    case "late":
      return (
        <span className="font-medium text-red-700">Late</span>
      );
    case "at_risk":
      return (
        <span className="font-medium text-amber-700">At risk</span>
      );
    case "on_track":
      return (
        <span className="font-medium text-slate-700">On track</span>
      );
    case "future_date":
      return (
        <span className="italic text-slate-400">Check date</span>
      );
    case "none":
      return (
        <span className="italic text-slate-400">No deadline</span>
      );
    case "done":
      return (
        <span className="text-slate-400">—</span>
      );
    default:
      return null;
  }
}

export function DeadlineCell({
  ticket,
  showStaticTime = true,
}: DeadlineCellProps) {
  const now = useNow();

  // If clock has not yet hydrated or SSR, render fallback static time
  if (now === null) {
    const fallbackIso = ticket.createdAt
      ? formatDateTime(ticket.createdAt)
      : null;
    return (
      <div className="flex flex-col text-xs text-slate-500 tabular">
        <span>{fallbackIso ?? "—"}</span>
      </div>
    );
  }

  const info = getDeadlineInfo(ticket, now);
  const countdown = formatCountdown(info.remainingMs, info.state);
  const formattedStatic = info.deadlineIso ? formatDateTime(info.deadlineIso) : null;
  const fullStatic = info.deadlineIso ? formatDateTimeFull(info.deadlineIso) : "";

  return (
    <div className="flex flex-col text-xs tabular">
      {/* State label + Countdown */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {getStatusBadge(info.state)}
        {countdown && (
          <span className="font-mono text-slate-600 font-normal">
            {countdown}
          </span>
        )}
      </div>

      {/* Static time subtitle */}
      {showStaticTime && formattedStatic && (
        <time
          dateTime={info.deadlineIso || undefined}
          title={fullStatic || undefined}
          className="text-[11px] text-slate-400 font-normal mt-0.5"
        >
          {formattedStatic}
        </time>
      )}
    </div>
  );
}
