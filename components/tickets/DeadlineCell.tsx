"use client";

import type { Ticket } from "@/types/ticket";
import { formatDateTime, formatDateTimeFull, getDeadline } from "@/lib/tickets/time";
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
  const pillBase =
    "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium leading-none";

  switch (state) {
    case "late":
      return (
        <span className={`${pillBase} bg-red-50 text-red-700 border border-red-200`}>
          Late
        </span>
      );
    case "at_risk":
      return (
        <span className={`${pillBase} bg-amber-50 text-amber-800 border border-amber-200`}>
          At risk
        </span>
      );
    case "on_track":
      return (
        <span className={`${pillBase} bg-green-50 text-green-800 border border-green-200`}>
          On track
        </span>
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

  // If clock has not yet hydrated or SSR, render fallback static deadline time
  if (now === null) {
    if (ticket.status === "resolved" || ticket.status === "closed") {
      return (
        <div className="flex flex-col text-xs text-slate-500 tabular">
          <span>—</span>
        </div>
      );
    }
    const deadlineIso = getDeadline(ticket.createdAt, ticket.priority);
    const fallbackFormatted = deadlineIso ? formatDateTime(deadlineIso) : "—";
    const fullStatic = deadlineIso ? formatDateTimeFull(deadlineIso) : "";
    return (
      <div className="flex flex-col text-xs text-slate-500 tabular">
        {deadlineIso ? (
          <time dateTime={deadlineIso} title={fullStatic || undefined}>
            {fallbackFormatted}
          </time>
        ) : (
          <span>{fallbackFormatted}</span>
        )}
      </div>
    );
  }

  const info = getDeadlineInfo(ticket, now);
  const countdown = formatCountdown(info.remainingMs, info.state);
  const formattedStatic = info.deadlineIso ? formatDateTime(info.deadlineIso) : null;
  const fullStatic = info.deadlineIso ? formatDateTimeFull(info.deadlineIso) : "";

  return (
    <div className="flex flex-col text-xs tabular">
      {/* State pill + Countdown */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {getStatusBadge(info.state)}
        {countdown && (
          <span className="inline-block tabular-nums font-mono text-slate-600 font-normal min-w-[4.5rem]">
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
