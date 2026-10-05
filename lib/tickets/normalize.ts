import type {
  Category,
  Plan,
  Priority,
  RawTicket,
  Ticket,
  TicketDataIssue,
  TicketStatus,
  TriageDecision,
} from "@/types/ticket";
import { isValidAgentId } from "@/data/agents";
import { getSafeUrl } from "@/lib/safe-url";

const VALID_PLANS = new Set<Plan>(["free", "pro", "enterprise"]);
const VALID_CATEGORIES = new Set<Category>([
  "billing",
  "bug",
  "account_access",
  "feature_request",
  "other",
]);
const VALID_PRIORITIES = new Set<Priority>(["P0", "P1", "P2", "P3"]);
const VALID_STATUSES = new Set<TicketStatus>([
  "open",
  "in_progress",
  "resolved",
  "closed",
]);
const VALID_TRIAGE_DECISIONS = new Set<TriageDecision>([
  "auto_accept",
  "manual_review",
]);

/**
 * Normalizes created_at timestamp.
 * Handles:
 * - Timestamps with explicit timezone (Z or offset, e.g. +05:30) converted to UTC ISO string.
 * - Timestamps with NO timezone (e.g. "2026-09-20 11:30:00") assumed UTC and flagged 'assumed_utc'.
 * - Future dates flagged 'future_created_at' relative to `now`.
 * - Invalid/unparseable dates become null and flagged 'invalid_created_at'.
 */
function parseCreatedAt(
  rawCreatedAt: string | null | undefined,
  now: Date,
  issues: TicketDataIssue[]
): string | null {
  if (!rawCreatedAt || typeof rawCreatedAt !== "string") {
    issues.push("invalid_created_at");
    return null;
  }

  const trimmed = rawCreatedAt.trim();
  if (!trimmed) {
    issues.push("invalid_created_at");
    return null;
  }

  // Check if string lacks timezone indicator (no 'Z' and no +/- offset at end)
  // Example: "2026-09-20 11:30:00" or "2026-09-20T11:30:00"
  const hasTimezone = /([zZ]|([+-]\d{2}(:?\d{2})?))$/.test(trimmed);
  let dateString = trimmed;

  if (!hasTimezone) {
    // Replace space between date and time with 'T' if present and append 'Z' to assume UTC
    dateString = trimmed.replace(" ", "T") + "Z";
    issues.push("assumed_utc");
  }

  const parsed = new Date(dateString);
  if (isNaN(parsed.getTime())) {
    issues.push("invalid_created_at");
    return null;
  }

  const iso = parsed.toISOString();
  if (parsed.getTime() > now.getTime()) {
    issues.push("future_created_at");
  }

  return iso;
}

/**
 * Normalizes a single raw ticket into the safe, structured Ticket model.
 * Never throws on malformed or malicious data.
 */
export function normalizeTicket(raw: RawTicket, now: Date): Ticket {
  const issues: TicketDataIssue[] = [];

  // Subject
  let subject = "";
  if (typeof raw.subject === "string" && raw.subject.length > 0) {
    subject = raw.subject;
  } else {
    issues.push("empty_subject");
  }

  // Body
  let body: string | null = null;
  if (typeof raw.body === "string" && raw.body.length > 0) {
    body = raw.body;
  } else {
    issues.push("empty_body");
  }

  // Plan
  let plan: Plan | null = null;
  if (raw.customer_plan && VALID_PLANS.has(raw.customer_plan as Plan)) {
    plan = raw.customer_plan as Plan;
  } else {
    issues.push("invalid_plan");
  }

  // Category
  let category: Category | null = null;
  if (raw.category && VALID_CATEGORIES.has(raw.category as Category)) {
    category = raw.category as Category;
  } else {
    issues.push("invalid_category");
  }

  // Priority
  let priority: Priority | null = null;
  if (raw.priority && VALID_PRIORITIES.has(raw.priority as Priority)) {
    priority = raw.priority as Priority;
  } else {
    issues.push("invalid_priority");
  }

  // AI Priority
  let aiPriority: Priority | null = null;
  if (raw.ai_priority && VALID_PRIORITIES.has(raw.ai_priority as Priority)) {
    aiPriority = raw.ai_priority as Priority;
  }

  // Status
  let status: TicketStatus | null = null;
  if (raw.status && VALID_STATUSES.has(raw.status as TicketStatus)) {
    status = raw.status as TicketStatus;
  } else {
    issues.push("invalid_status");
  }

  // Agent Assignment
  let assignedTo: string | null = null;
  let assignedToUnknown: string | null = null;
  if (raw.assigned_to) {
    if (isValidAgentId(raw.assigned_to)) {
      assignedTo = raw.assigned_to;
    } else {
      assignedToUnknown = raw.assigned_to;
      issues.push("invalid_agent");
    }
  }

  // Triage Decision — fail safe to 'manual_review'
  let triageDecision: TriageDecision = "manual_review";
  if (
    raw.triage_decision &&
    VALID_TRIAGE_DECISIONS.has(raw.triage_decision as TriageDecision)
  ) {
    triageDecision = raw.triage_decision as TriageDecision;
  } else {
    issues.push("invalid_triage_decision");
  }

  // Attachment URL
  let attachmentUrl: string | null = null;
  if (raw.attachment_url) {
    const safeUrl = getSafeUrl(raw.attachment_url);
    if (safeUrl) {
      attachmentUrl = safeUrl;
    } else {
      issues.push("unsafe_attachment_url");
    }
  }

  // Created At
  const createdAt = parseCreatedAt(raw.created_at, now, issues);

  // Final Priority if explicitly provided
  let finalPriority: Priority | null = null;
  const rawFinalP = raw.finalPriority ?? raw.final_priority;
  if (rawFinalP && VALID_PRIORITIES.has(rawFinalP as Priority)) {
    finalPriority = rawFinalP as Priority;
  }

  // Human Review if already recorded
  let humanReview: import("@/types/ticket").HumanReview | null = null;
  const rawHuman = raw.humanReview ?? raw.human_review;
  if (rawHuman && typeof rawHuman === "object") {
    const rh = rawHuman as Record<string, unknown>;
    if (rh.action === "accepted" || rh.action === "changed") {
      humanReview = {
        action: rh.action,
        reviewedBy:
          typeof rh.reviewedBy === "string"
            ? rh.reviewedBy
            : typeof rh.reviewed_by === "string"
            ? rh.reviewed_by
            : "agent-1",
        note: typeof rh.note === "string" ? rh.note : null,
      };
    }
  }

  return {
    id: raw.external_id ? String(raw.external_id) : "",
    customerId: raw.customer_id ? String(raw.customer_id) : "",
    plan,
    subject,
    body,
    attachmentUrl,
    createdAt,
    status,
    assignedTo,
    assignedToUnknown,
    category,
    priority,
    aiPriority,
    finalPriority,
    summary: typeof raw.summary === "string" ? raw.summary : null,
    triageDecision,
    reviewReason:
      typeof raw.review_reason === "string" ? raw.review_reason : null,
    dataIssues: issues,
    humanReview,
    version: 1,
    updatedAt: now.toISOString(),
  };
}

/**
 * Normalizes an array of raw tickets and deduplicates by external_id.
 * Keeps the FIRST occurrence and drops subsequent duplicates.
 */
export function normalizeTickets(
  rawList: RawTicket[],
  now: Date
): { tickets: Ticket[]; duplicatesRemoved: number } {
  const seenIds = new Set<string>();
  const tickets: Ticket[] = [];
  let duplicatesRemoved = 0;

  for (const raw of rawList) {
    const normalized = normalizeTicket(raw, now);
    if (!normalized.id) {
      tickets.push(normalized);
      continue;
    }

    if (seenIds.has(normalized.id)) {
      duplicatesRemoved++;
    } else {
      seenIds.add(normalized.id);
      tickets.push(normalized);
    }
  }

  return { tickets, duplicatesRemoved };
}

export { getNormalizedTickets, getTicketById } from "./data";
