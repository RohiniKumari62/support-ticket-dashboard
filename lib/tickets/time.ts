import type { Priority } from "@/types/ticket";

const PRIORITY_OFFSET_HOURS: Record<Priority, number> = {
  P0: 1,
  P1: 4,
  P2: 24,
  P3: 72,
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * Calculates deadline timestamp given created_at and ticket priority.
 * Returns ISO string in UTC, or null if createdAt/priority is invalid.
 */
export function getDeadline(
  createdAt: string | null,
  priority: Priority | null
): string | null {
  if (!createdAt || !priority || !(priority in PRIORITY_OFFSET_HOURS)) {
    return null;
  }

  const date = new Date(createdAt);
  if (isNaN(date.getTime())) {
    return null;
  }

  const offsetMs = PRIORITY_OFFSET_HOURS[priority] * 60 * 60 * 1000;
  const deadlineDate = new Date(date.getTime() + offsetMs);
  return deadlineDate.toISOString();
}

/**
 * Formats an ISO date string in fixed UTC timezone for consistent SSR/client output.
 * Output: "20 Sep, 09:15" or "—" for invalid/null dates.
 */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";

  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";

  const day = date.getUTCDate();
  const month = MONTH_NAMES[date.getUTCMonth()];
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${day} ${month}, ${hours}:${minutes}`;
}

/**
 * Returns full UTC representation for title attribute, e.g. "2026-09-20 09:15 UTC".
 */
export function formatDateTimeFull(iso: string | null): string {
  if (!iso) return "";

  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
}
