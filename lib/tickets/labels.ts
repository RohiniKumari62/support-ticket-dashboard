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

