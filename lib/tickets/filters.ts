import type {
  Category,
  Priority,
  Ticket,
  TicketStatus,
  TriageDecision,
} from "@/types/ticket";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/lib/tickets/labels";

// ─── Filter Types ──────────────────────────────────────────────────────────────

export interface TicketFilters {
  q: string;
  status: TicketStatus | null;
  priority: Priority | null;
  category: Category | null;
  decision: TriageDecision | null;
}

export const EMPTY_FILTERS: TicketFilters = {
  q: "",
  status: null,
  priority: null,
  category: null,
  decision: null,
};

// ─── Allowed value sets (for safe parsing) ────────────────────────────────────

export const VALID_STATUSES = new Set<TicketStatus>([
  "open",
  "in_progress",
  "resolved",
  "closed",
]);
export const VALID_PRIORITIES = new Set<Priority>(["P0", "P1", "P2", "P3"]);
export const VALID_CATEGORIES = new Set<Category>([
  "billing",
  "bug",
  "account_access",
  "feature_request",
  "other",
]);
export const VALID_DECISIONS = new Set<TriageDecision>([
  "auto_accept",
  "manual_review",
]);

// ─── Select option lists (value + label) ─────────────────────────────────────

export const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = (
  Object.entries(STATUS_LABELS) as [TicketStatus, string][]
).map(([value, label]) => ({ value, label }));

export const PRIORITY_OPTIONS: { value: Priority; label: string }[] = (
  Object.entries(PRIORITY_LABELS) as [Priority, string][]
).map(([value, label]) => ({ value, label }));

export const CATEGORY_OPTIONS: { value: Category; label: string }[] = (
  Object.entries(CATEGORY_LABELS) as [Category, string][]
).map(([value, label]) => ({ value, label }));

export const DECISION_OPTIONS: { value: TriageDecision; label: string }[] = [
  { value: "auto_accept", label: "Auto-accepted" },
  { value: "manual_review", label: "Needs review" },
];

// ─── Parse ────────────────────────────────────────────────────────────────────

/**
 * Parses URL searchParams into typed TicketFilters.
 * - Unknown params are silently ignored
 * - Invalid enum values are treated as "All" (null)
 * - Repeated keys use the first value
 * - Never throws or crashes
 */
export function parseTicketFilters(
  params: Record<string, string | string[] | undefined>
): TicketFilters {
  function first(v: string | string[] | undefined): string | undefined {
    if (Array.isArray(v)) return v[0];
    return v;
  }

  // q: trim, collapse internal whitespace, cap at 100 chars
  const rawQ = first(params["q"]) ?? "";
  const q = rawQ.trim().replace(/\s+/g, " ").slice(0, 100);

  // status
  const rawStatus = first(params["status"]);
  const status =
    rawStatus && VALID_STATUSES.has(rawStatus as TicketStatus)
      ? (rawStatus as TicketStatus)
      : null;

  // priority
  const rawPriority = first(params["priority"]);
  const priority =
    rawPriority && VALID_PRIORITIES.has(rawPriority as Priority)
      ? (rawPriority as Priority)
      : null;

  // category
  const rawCategory = first(params["category"]);
  const category =
    rawCategory && VALID_CATEGORIES.has(rawCategory as Category)
      ? (rawCategory as Category)
      : null;

  // decision
  const rawDecision = first(params["decision"]);
  const decision =
    rawDecision && VALID_DECISIONS.has(rawDecision as TriageDecision)
      ? (rawDecision as TriageDecision)
      : null;

  return { q, status, priority, category, decision };
}

// ─── Filter ───────────────────────────────────────────────────────────────────

/**
 * Returns true if a single ticket satisfies all active filter conditions.
 * - Search is case-insensitive substring on subject OR body (body may be null)
 * - Tickets with null normalized value are excluded when that filter is active
 */
export function ticketMatchesFilters(
  ticket: Ticket,
  filters: TicketFilters
): boolean {
  const { q, status, priority, category, decision } = filters;
  const normalizedQ = q ? q.toLowerCase() : "";

  // Search filter — subject and body only
  if (normalizedQ) {
    const inSubject = ticket.subject.toLowerCase().includes(normalizedQ);
    const inBody =
      ticket.body != null && ticket.body.toLowerCase().includes(normalizedQ);
    if (!inSubject && !inBody) return false;
  }

  // Status filter
  if (status !== null) {
    if (ticket.status !== status) return false;
  }

  // Priority filter
  if (priority !== null) {
    if (ticket.priority !== priority) return false;
  }

  // Category filter
  if (category !== null) {
    if (ticket.category !== category) return false;
  }

  // AI decision filter (uses normalized triageDecision)
  if (decision !== null) {
    if (ticket.triageDecision !== decision) return false;
  }

  return true;
}

/**
 * Filters a list of normalized tickets by the given filters (AND-combined).
 * - Preserves incoming order
 */
export function filterTickets(
  tickets: Ticket[],
  filters: TicketFilters
): Ticket[] {
  return tickets.filter((ticket) => ticketMatchesFilters(ticket, filters));
}

// ─── Serialize ────────────────────────────────────────────────────────────────

/**
 * Serializes TicketFilters to a query string WITHOUT the leading "?".
 * Omits empty/default values. Stable param order: q, status, priority, category, decision.
 * Returns "" when no filters are active.
 */
export function serializeTicketFilters(filters: TicketFilters): string {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.category) params.set("category", filters.category);
  if (filters.decision) params.set("decision", filters.decision);

  return params.toString();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if any filter is active (non-default).
 */
export function hasActiveFilters(filters: TicketFilters): boolean {
  return (
    filters.q !== "" ||
    filters.status !== null ||
    filters.priority !== null ||
    filters.category !== null ||
    filters.decision !== null
  );
}
