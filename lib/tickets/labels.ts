import type { Category, Plan, Priority, TicketStatus, TriageDecision } from "@/types/ticket";

export const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  billing: "Billing",
  bug: "Bug",
  account_access: "Account access",
  feature_request: "Feature request",
  other: "Other",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  P0: "P0",
  P1: "P1",
  P2: "P2",
  P3: "P3",
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export function getPlanLabel(plan: Plan | null | undefined): string {
  if (!plan || !(plan in PLAN_LABELS)) return "Unknown";
  return PLAN_LABELS[plan];
}

export function getCategoryLabel(category: Category | null | undefined): string {
  if (!category || !(category in CATEGORY_LABELS)) return "Unknown";
  return CATEGORY_LABELS[category];
}

export function getPriorityLabel(priority: Priority | null | undefined): string {
  if (!priority || !(priority in PRIORITY_LABELS)) return "Unknown";
  return PRIORITY_LABELS[priority];
}

export function getStatusLabel(status: TicketStatus | null | undefined): string {
  if (!status || !(status in STATUS_LABELS)) return "Unknown";
  return STATUS_LABELS[status];
}

export const TRIAGE_DECISION_LABELS: Record<TriageDecision, string> = {
  auto_accept: "Auto-accepted",
  manual_review: "Needs review",
};

export function getTriageDecisionLabel(
  decision: TriageDecision | null | undefined
): string {
  if (!decision || !(decision in TRIAGE_DECISION_LABELS)) return "Unknown";
  return TRIAGE_DECISION_LABELS[decision];
}

export const REVIEW_REASON_LABELS: Record<string, string> = {
  flagged_input: "The AI flagged suspicious content in this ticket",
  invalid_output: "The AI returned invalid values",
  empty_ticket: "The ticket is empty",
  rule_adjusted: "A business rule changed the AI's priority",
};

export function getReviewReasonLabel(
  reason: string | null | undefined
): string {
  if (!reason) return "";
  return REVIEW_REASON_LABELS[reason] ?? reason;
}

export const DATA_ISSUE_LABELS: Record<string, string> = {
  empty_subject: "empty subject",
  empty_body: "empty body",
  invalid_plan: "invalid plan",
  invalid_category: "invalid category",
  invalid_priority: "invalid priority",
  invalid_status: "invalid status",
  invalid_agent: "unknown agent",
  invalid_triage_decision: "invalid triage decision",
  unsafe_attachment_url: "unsafe attachment URL",
  assumed_utc: "assumed UTC time",
  invalid_created_at: "invalid created time",
  future_created_at: "future created time",
};

export function formatDataIssues(issues: string[]): string {
  if (!issues || issues.length === 0) return "";
  const readable = issues.map((i) => DATA_ISSUE_LABELS[i] ?? i.replace(/_/g, " "));
  return `This ticket has data problems: ${readable.join(", ")}.`;
}

