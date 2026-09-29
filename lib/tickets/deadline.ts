import type { Priority, Ticket } from "@/types/ticket";
import { getDeadline } from "./time";

export const PRIORITY_HOURS: Record<Priority, number> = {
  P0: 1,
  P1: 4,
  P2: 24,
  P3: 72,
};

export type DeadlineState =
  | "late"
  | "at_risk"
  | "on_track"
  | "none"
  | "future_date"
  | "done";

export interface DeadlineInfo {
  state: DeadlineState;
  remainingMs: number | null;
  deadlineIso: string | null;
}

/**
 * Calculates dynamic deadline status and remaining time for a ticket.
 * - resolved/closed tickets return "done" (no countdown).
 * - invalid/null createdAt or priority returns "none".
 * - future createdAt returns "future_date" (displays "Check date").
 * - remainingMs <= 0 is "late".
 * - 0 < remainingMs < 20% of total allowed time is "at_risk" (strictly less; exactly 20% is "on_track").
 * - otherwise "on_track".
 * Pure, NaN-safe, never throws.
 */
export function getDeadlineInfo(ticket: Ticket, nowMs: number): DeadlineInfo {
  if (ticket.status === "resolved" || ticket.status === "closed") {
    return { state: "done", remainingMs: null, deadlineIso: null };
  }

  if (
    !ticket.createdAt ||
    !ticket.priority ||
    !(ticket.priority in PRIORITY_HOURS)
  ) {
    return { state: "none", remainingMs: null, deadlineIso: null };
  }

  const createdTime = new Date(ticket.createdAt).getTime();
  if (isNaN(createdTime) || isNaN(nowMs)) {
    return { state: "none", remainingMs: null, deadlineIso: null };
  }

  if (createdTime > nowMs) {
    return {
      state: "future_date",
      remainingMs: null,
      deadlineIso: getDeadline(ticket.createdAt, ticket.priority),
    };
  }

  const totalMs = PRIORITY_HOURS[ticket.priority] * 3600000;
  const deadlineMs = createdTime + totalMs;
  const remainingMs = deadlineMs - nowMs;
  const deadlineIso = new Date(deadlineMs).toISOString();

  if (remainingMs <= 0) {
    return { state: "late", remainingMs, deadlineIso };
  }

  // Strictly less than 20% of allowed total window is at risk
  if (remainingMs < 0.2 * totalMs) {
    return { state: "at_risk", remainingMs, deadlineIso };
  }

  return { state: "on_track", remainingMs, deadlineIso };
}

/**
 * Formats milliseconds duration into "HH:MM:SS" or "Nd HH:MM:SS".
 * Late tickets (or state === "late") prefix with "Late by ".
 */
export function formatCountdown(
  remainingMs: number | null,
  state?: DeadlineState
): string {
  if (remainingMs === null || isNaN(remainingMs)) {
    return "";
  }

  const isLate = state === "late" || remainingMs <= 0;
  const absMs = Math.abs(remainingMs);
  const totalSec = Math.floor(absMs / 1000);

  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");

  let formatted = `${hh}:${mm}:${ss}`;
  if (days > 0) {
    formatted = `${days}d ${formatted}`;
  }

  if (isLate) {
    return `Late by ${formatted}`;
  }

  return formatted;
}
