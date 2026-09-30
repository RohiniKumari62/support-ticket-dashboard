import type {
  Category,
  Plan,
  Priority,
  Ticket,
  TicketDataIssue,
  TicketStatus,
  TriageDecision,
} from "@/types/ticket";
import { isValidAgentId } from "@/data/agents";
import { getSafeUrl } from "@/lib/safe-url";

const ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

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

const VALID_DATA_ISSUES = new Set<TicketDataIssue>([
  "unsafe_attachment_url",
  "invalid_plan",
  "invalid_category",
  "invalid_priority",
  "invalid_status",
  "invalid_agent",
  "invalid_triage_decision",
  "assumed_utc",
  "future_created_at",
  "invalid_created_at",
  "empty_subject",
  "empty_body",
  "invalid_output",
]);

let droppedTicketCount = 0;

export function getDroppedTicketCount(): number {
  return droppedTicketCount;
}

export function resetDroppedTicketCount(): void {
  droppedTicketCount = 0;
}

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

/**
 * Validates untrusted ticket candidate at the client API boundary.
 * Drops invalid or hostile objects and returns null.
 */
export function parseTicket(candidate: unknown): Ticket | null {
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    Array.isArray(candidate)
  ) {
    droppedTicketCount++;
    return null;
  }

  const raw = candidate as Record<string, unknown>;

  // ID validation
  const id = raw.id;
  if (
    typeof id !== "string" ||
    !ID_REGEX.test(id) ||
    id === "__proto__" ||
    id === "constructor" ||
    id === "prototype"
  ) {
    droppedTicketCount++;
    return null;
  }

  // Version validation: positive integer
  const version = raw.version;
  if (
    typeof version !== "number" ||
    !Number.isInteger(version) ||
    version < 1
  ) {
    droppedTicketCount++;
    return null;
  }

  // updatedAt validation: must be valid ISO string
  const updatedAt = raw.updatedAt;
  if (!isValidIsoDate(updatedAt)) {
    droppedTicketCount++;
    return null;
  }

  // createdAt validation: null or valid ISO string
  const createdAt = raw.createdAt;
  let parsedCreatedAt: string | null = null;
  if (createdAt !== null && createdAt !== undefined) {
    if (!isValidIsoDate(createdAt)) {
      droppedTicketCount++;
      return null;
    }
    parsedCreatedAt = createdAt;
  }

  // customerId: string <= 100
  const customerId = raw.customerId;
  if (typeof customerId !== "string" || customerId.length > 100) {
    droppedTicketCount++;
    return null;
  }

  // subject: string <= 2000 chars
  const subject = raw.subject;
  if (typeof subject !== "string" || subject.length > 2000) {
    droppedTicketCount++;
    return null;
  }

  // body: string <= 20000 chars or null
  const body = raw.body;
  let parsedBody: string | null = null;
  if (body !== null && body !== undefined) {
    if (typeof body !== "string" || body.length > 20000) {
      droppedTicketCount++;
      return null;
    }
    parsedBody = body;
  }

  // summary: string <= 2000 chars or null
  const summary = raw.summary;
  let parsedSummary: string | null = null;
  if (summary !== null && summary !== undefined) {
    if (typeof summary !== "string" || summary.length > 2000) {
      droppedTicketCount++;
      return null;
    }
    parsedSummary = summary;
  }

  // reviewReason: string <= 1000 chars or null
  const reviewReason = raw.reviewReason;
  let parsedReviewReason: string | null = null;
  if (reviewReason !== null && reviewReason !== undefined) {
    if (typeof reviewReason !== "string" || reviewReason.length > 1000) {
      droppedTicketCount++;
      return null;
    }
    parsedReviewReason = reviewReason;
  }

  // plan: allowlisted or null
  const plan = raw.plan;
  let parsedPlan: Plan | null = null;
  if (plan !== null && plan !== undefined) {
    if (!VALID_PLANS.has(plan as Plan)) {
      droppedTicketCount++;
      return null;
    }
    parsedPlan = plan as Plan;
  }

  // category: allowlisted or null
  const category = raw.category;
  let parsedCategory: Category | null = null;
  if (category !== null && category !== undefined) {
    if (!VALID_CATEGORIES.has(category as Category)) {
      droppedTicketCount++;
      return null;
    }
    parsedCategory = category as Category;
  }

  // priority: allowlisted or null
  const priority = raw.priority;
  let parsedPriority: Priority | null = null;
  if (priority !== null && priority !== undefined) {
    if (!VALID_PRIORITIES.has(priority as Priority)) {
      droppedTicketCount++;
      return null;
    }
    parsedPriority = priority as Priority;
  }

  // aiPriority: allowlisted or null
  const aiPriority = raw.aiPriority;
  let parsedAiPriority: Priority | null = null;
  if (aiPriority !== null && aiPriority !== undefined) {
    if (!VALID_PRIORITIES.has(aiPriority as Priority)) {
      droppedTicketCount++;
      return null;
    }
    parsedAiPriority = aiPriority as Priority;
  }

  // status: allowlisted or null
  const status = raw.status;
  let parsedStatus: TicketStatus | null = null;
  if (status !== null && status !== undefined) {
    if (!VALID_STATUSES.has(status as TicketStatus)) {
      droppedTicketCount++;
      return null;
    }
    parsedStatus = status as TicketStatus;
  }

  // assignedTo: valid agent ID or null
  const assignedTo = raw.assignedTo;
  let parsedAssignedTo: string | null = null;
  if (assignedTo !== null && assignedTo !== undefined) {
    if (typeof assignedTo !== "string" || !isValidAgentId(assignedTo)) {
      droppedTicketCount++;
      return null;
    }
    parsedAssignedTo = assignedTo;
  }

  // assignedToUnknown: string <= 64 or null
  const assignedToUnknown = raw.assignedToUnknown;
  let parsedAssignedToUnknown: string | null = null;
  if (assignedToUnknown !== null && assignedToUnknown !== undefined) {
    if (typeof assignedToUnknown !== "string" || assignedToUnknown.length > 64) {
      droppedTicketCount++;
      return null;
    }
    parsedAssignedToUnknown = assignedToUnknown;
  }

  // triageDecision: allowlisted or fails safe to manual_review
  const triageDecision = raw.triageDecision;
  let parsedTriageDecision: TriageDecision = "manual_review";
  if (triageDecision && VALID_TRIAGE_DECISIONS.has(triageDecision as TriageDecision)) {
    parsedTriageDecision = triageDecision as TriageDecision;
  }

  // attachmentUrl: re-checked with getSafeUrl
  const attachmentUrl = raw.attachmentUrl;
  let parsedAttachmentUrl: string | null = null;
  if (attachmentUrl !== null && attachmentUrl !== undefined) {
    if (typeof attachmentUrl !== "string") {
      droppedTicketCount++;
      return null;
    }
    parsedAttachmentUrl = getSafeUrl(attachmentUrl);
  }

  // dataIssues: array of known issue strings
  const dataIssues = raw.dataIssues;
  const parsedDataIssues: TicketDataIssue[] = [];
  if (Array.isArray(dataIssues)) {
    for (const issue of dataIssues) {
      if (typeof issue === "string" && VALID_DATA_ISSUES.has(issue as TicketDataIssue)) {
        parsedDataIssues.push(issue as TicketDataIssue);
      }
    }
  }

  // humanReview: null or validated object
  const humanReview = raw.humanReview;
  let parsedHumanReview: Ticket["humanReview"] = null;
  if (humanReview !== null && humanReview !== undefined) {
    if (typeof humanReview !== "object" || Array.isArray(humanReview)) {
      droppedTicketCount++;
      return null;
    }
    const hr = humanReview as Record<string, unknown>;
    const rawAction = hr.action;
    if (
      rawAction !== "accept" &&
      rawAction !== "accepted" &&
      rawAction !== "change" &&
      rawAction !== "changed"
    ) {
      droppedTicketCount++;
      return null;
    }
    const action: "accepted" | "changed" =
      rawAction === "accept" ? "accepted" : rawAction === "change" ? "changed" : rawAction;
    const reviewedBy = hr.reviewedBy;
    if (typeof reviewedBy !== "string" || !isValidAgentId(reviewedBy)) {
      droppedTicketCount++;
      return null;
    }
    const note = hr.note;
    let parsedNote: string | null = null;
    if (note !== null && note !== undefined) {
      if (typeof note !== "string" || note.length > 1000) {
        droppedTicketCount++;
        return null;
      }
      parsedNote = note;
    }
    parsedHumanReview = {
      action,
      reviewedBy,
      note: parsedNote,
    };
  }

  return {
    id,
    customerId,
    plan: parsedPlan,
    subject,
    body: parsedBody,
    attachmentUrl: parsedAttachmentUrl,
    createdAt: parsedCreatedAt,
    status: parsedStatus,
    assignedTo: parsedAssignedTo,
    assignedToUnknown: parsedAssignedToUnknown,
    category: parsedCategory,
    priority: parsedPriority,
    aiPriority: parsedAiPriority,
    summary: parsedSummary,
    triageDecision: parsedTriageDecision,
    reviewReason: parsedReviewReason,
    dataIssues: parsedDataIssues,
    humanReview: parsedHumanReview,
    version,
    updatedAt,
  };
}

/**
 * Validates an array of tickets, dropping invalid items and returning only valid tickets.
 */
export function parseTicketsArray(items: unknown[]): {
  valid: Ticket[];
  droppedCount: number;
} {
  const valid: Ticket[] = [];
  let dropped = 0;

  for (const item of items) {
    const ticket = parseTicket(item);
    if (ticket) {
      valid.push(ticket);
    } else {
      dropped++;
    }
  }

  return { valid, droppedCount: dropped };
}
