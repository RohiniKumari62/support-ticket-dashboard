export interface Agent {
  id: string;
  name: string;
}

export type Plan = "free" | "pro" | "enterprise";

export type Category =
  | "billing"
  | "bug"
  | "account_access"
  | "feature_request"
  | "other";

export type Priority = "P0" | "P1" | "P2" | "P3";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type TriageDecision = "auto_accept" | "manual_review";

export type TicketDataIssue =
  | "empty_subject"
  | "empty_body"
  | "invalid_plan"
  | "invalid_category"
  | "invalid_priority"
  | "invalid_status"
  | "invalid_agent"
  | "invalid_triage_decision"
  | "unsafe_attachment_url"
  | "assumed_utc"
  | "invalid_created_at"
  | "future_created_at";

export interface RawTicket {
  external_id?: string | null;
  customer_id?: string | null;
  customer_plan?: string | null;
  subject?: string | null;
  body?: string | null;
  attachment_url?: string | null;
  created_at?: string | null;
  status?: string | null;
  assigned_to?: string | null;
  category?: string | null;
  priority?: string | null;
  ai_priority?: string | null;
  summary?: string | null;
  triage_decision?: string | null;
  review_reason?: string | null;
  [key: string]: unknown;
}

export interface HumanReview {
  action: "accepted" | "changed";
  reviewedBy: string;
  note: string | null;
}

export interface Ticket {
  id: string;
  customerId: string;
  plan: Plan | null;
  subject: string;
  body: string | null;
  attachmentUrl: string | null;
  createdAt: string | null;
  status: TicketStatus | null;
  assignedTo: string | null;
  assignedToUnknown: string | null;
  category: Category | null;
  priority: Priority | null;
  aiPriority: Priority | null;
  summary: string | null;
  triageDecision: TriageDecision;
  reviewReason: string | null;
  dataIssues: TicketDataIssue[];
  humanReview?: HumanReview | null;
}
