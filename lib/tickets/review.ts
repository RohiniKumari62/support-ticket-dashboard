import type {
  Category,
  Priority,
  Ticket,
} from "@/types/ticket";
import { applyEnterpriseFloor } from "./rules";

export const REASON_MIN_LENGTH = 10;
export const REASON_MAX_LENGTH = 500;

const PRIORITY_ORDER: Record<string, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

const VALID_CATEGORIES = new Set<Category>([
  "billing",
  "bug",
  "account_access",
  "feature_request",
  "other",
]);

const VALID_PRIORITIES = new Set<Priority>(["P0", "P1", "P2", "P3"]);

/**
 * Returns true if a ticket is awaiting human triage review.
 * A ticket is NOT pending review if:
 * 1. Its triageDecision is not 'manual_review'.
 * 2. It has already undergone human review (humanReview != null).
 * 3. Its finalPriority has been explicitly set.
 * 4. A manual priority is already in place (aiPriority differs from final priority).
 */
export function isReviewPending(ticket: Ticket): boolean {
  if (ticket.triageDecision !== "manual_review") {
    return false;
  }
  if (ticket.humanReview != null) {
    return false;
  }
  if (ticket.finalPriority != null) {
    return false;
  }
  if (
    ticket.aiPriority != null &&
    ticket.priority != null &&
    ticket.aiPriority !== ticket.priority
  ) {
    return false;
  }
  return true;
}

/**
 * Returns tickets in the review queue:
 * manual_review tickets that have not yet undergone human review or manual change.
 * Sorted by priority (P0 -> P3, invalid last), then oldest created time first,
 * then id for stable tie-breaking.
 */
export function getReviewQueue(tickets: Ticket[]): Ticket[] {
  const queue = tickets.filter(isReviewPending);

  return queue.sort((a, b) => {
    // 1. Priority: P0 (0) to P3 (3), null/invalid (4) last
    const pA = a.priority && a.priority in PRIORITY_ORDER ? PRIORITY_ORDER[a.priority] : 4;
    const pB = b.priority && b.priority in PRIORITY_ORDER ? PRIORITY_ORDER[b.priority] : 4;
    if (pA !== pB) return pA - pB;

    // 2. Oldest createdAt first (longest waiting first). Null/invalid last.
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : NaN;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : NaN;

    const validTimeA = !isNaN(timeA);
    const validTimeB = !isNaN(timeB);

    if (validTimeA && validTimeB) {
      if (timeA !== timeB) return timeA - timeB;
    } else if (validTimeA) {
      return -1;
    } else if (validTimeB) {
      return 1;
    }

    // 3. Stable tie-breaker by ticket ID
    return a.id.localeCompare(b.id);
  });
}

/**
 * An AI answer is acceptable only if both category and priority are non-null and valid.
 * Malformed AI output (such as T-2004) cannot be accepted as-is.
 */
export function isAcceptable(ticket: Ticket): boolean {
  return ticket.category !== null && ticket.priority !== null;
}

export interface ReviewChangeInput {
  category: Category | "" | null;
  priority: Priority | "" | null;
  reason: string;
}

export interface ValidationSuccess {
  ok: true;
  value: {
    category: Category;
    priority: Priority;
    reason: string;
  };
}

export interface ValidationFailure {
  ok: false;
  errors: {
    category?: string;
    priority?: string;
    reason?: string;
    form?: string;
  };
}

export type ReviewValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Validates changes made to a ticket's category or priority during human review.
 */
export function validateReviewChange(
  ticket: Ticket,
  input: ReviewChangeInput
): ReviewValidationResult {
  const errors: {
    category?: string;
    priority?: string;
    reason?: string;
    form?: string;
  } = {};

  // 1. Category validation
  if (!input.category || !VALID_CATEGORIES.has(input.category as Category)) {
    errors.category = "Select a valid category.";
  }

  // 2. Priority validation
  if (!input.priority || !VALID_PRIORITIES.has(input.priority as Priority)) {
    errors.priority = "Select a valid priority.";
  }

  // 3. Reason validation: trimmed length between 10 and 500
  const trimmedReason = (input.reason ?? "").trim();
  if (trimmedReason.length < REASON_MIN_LENGTH) {
    errors.reason = "Enter a reason of at least 10 characters.";
  } else if (trimmedReason.length > REASON_MAX_LENGTH) {
    errors.reason = "Reason cannot exceed 500 characters.";
  }

  // 4. Enterprise rule: enterprise tickets must stay at P1 or higher (P0 or P1)
  if (
    input.priority &&
    VALID_PRIORITIES.has(input.priority as Priority) &&
    ticket.plan === "enterprise"
  ) {
    if (input.priority === "P2" || input.priority === "P3") {
      errors.priority = "Enterprise tickets must stay at P1 or higher.";
    }
  }

  // 5. Change check: at least one of category or priority must differ from the ticket's current value
  // Note: if ticket's current category or priority was null, any valid selection is considered a change.
  if (
    input.category &&
    VALID_CATEGORIES.has(input.category as Category) &&
    input.priority &&
    VALID_PRIORITIES.has(input.priority as Priority)
  ) {
    const categoryUnchanged = input.category === ticket.category;
    const priorityUnchanged = input.priority === ticket.priority;

    if (categoryUnchanged && priorityUnchanged) {
      errors.form = "Nothing changed. Change the category or priority, or use Accept.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      category: input.category as Category,
      priority: input.priority as Priority,
      reason: trimmedReason,
    },
  };
}

export type ReviewDecision =
  | { type: "accept" }
  | { type: "change"; category: Category; priority: Priority; reason: string };

/**
 * Pure function that applies a review decision and returns a new Ticket object.
 * Never mutates the original ticket. Preserves triageDecision.
 */
export function applyReview(
  ticket: Ticket,
  decision: ReviewDecision,
  reviewerId: string
): Ticket {
  if (decision.type === "accept") {
    // If enterprise floor applies to current priority (e.g. enterprise with P3/P2)
    const flooredPriority = applyEnterpriseFloor(ticket.plan, ticket.priority);
    const floorApplied =
      ticket.plan === "enterprise" &&
      flooredPriority !== ticket.priority &&
      ticket.priority !== null;

    return {
      ...ticket,
      priority: flooredPriority,
      aiPriority: floorApplied ? ticket.priority : ticket.aiPriority,
      finalPriority: flooredPriority,
      reviewReason: floorApplied ? "rule_adjusted" : ticket.reviewReason,
      humanReview: {
        action: "accepted",
        reviewedBy: reviewerId,
        note: null,
      },
    };
  }

  // Change decision
  const trimmedReason = decision.reason.trim();
  const previousPriority = ticket.priority;
  const newPriority = decision.priority;

  // aiPriority is set if final priority differs from previous valid AI priority
  let aiPriority = ticket.aiPriority;
  if (!aiPriority && previousPriority !== null && previousPriority !== newPriority) {
    aiPriority = previousPriority;
  }

  return {
    ...ticket,
    category: decision.category,
    priority: newPriority,
    aiPriority,
    finalPriority: newPriority,
    humanReview: {
      action: "changed",
      reviewedBy: reviewerId,
      note: trimmedReason,
    },
  };
}
