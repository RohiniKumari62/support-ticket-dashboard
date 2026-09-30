import { describe, it, expect } from "vitest";
import { isCountedTicket, isMyActiveTicket, isPendingReview } from "@/lib/tickets/counts";
import type { Ticket } from "@/types/ticket";

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "T-1",
    customerId: "cust-1",
    plan: "free",
    subject: "Sub",
    body: "Body",
    attachmentUrl: null,
    createdAt: "2026-09-20T10:00:00.000Z",
    status: "open",
    assignedTo: null,
    assignedToUnknown: null,
    category: "billing",
    priority: "P1",
    aiPriority: null,
    summary: null,
    triageDecision: "auto_accept",
    reviewReason: null,
    dataIssues: [],
    humanReview: null,
    version: 1,
    updatedAt: "2026-09-20T10:00:00.000Z",
    ...overrides,
  };
}

describe("counts predicates", () => {
  it("isPendingReview matches manual_review without humanReview", () => {
    expect(isPendingReview(makeTicket({ triageDecision: "manual_review", humanReview: null }))).toBe(true);
    expect(isPendingReview(makeTicket({ triageDecision: "manual_review", humanReview: { action: "accepted", reviewedBy: "agent-1", note: null } }))).toBe(false);
    expect(isPendingReview(makeTicket({ triageDecision: "auto_accept", humanReview: null }))).toBe(false);
  });

  it("isMyActiveTicket matches active open/in_progress assigned to specific agent", () => {
    expect(isMyActiveTicket(makeTicket({ assignedTo: "agent-1", status: "open" }), "agent-1")).toBe(true);
    expect(isMyActiveTicket(makeTicket({ assignedTo: "agent-1", status: "in_progress" }), "agent-1")).toBe(true);
    expect(isMyActiveTicket(makeTicket({ assignedTo: "agent-1", status: "resolved" }), "agent-1")).toBe(false);
    expect(isMyActiveTicket(makeTicket({ assignedTo: "agent-1", status: "closed" }), "agent-1")).toBe(false);
    expect(isMyActiveTicket(makeTicket({ assignedTo: "agent-2", status: "open" }), "agent-1")).toBe(false);
    expect(isMyActiveTicket(makeTicket({ assignedTo: null, status: "open" }), "agent-1")).toBe(false);
  });

  it("isCountedTicket matches pending review or valid agent with open/in_progress", () => {
    // Pending review
    expect(isCountedTicket(makeTicket({ triageDecision: "manual_review", humanReview: null, status: "open", assignedTo: null }))).toBe(true);
    expect(isCountedTicket(makeTicket({ triageDecision: "manual_review", humanReview: null, status: "closed", assignedTo: null }))).toBe(true);

    // Active assigned to valid agent
    expect(isCountedTicket(makeTicket({ triageDecision: "auto_accept", status: "open", assignedTo: "agent-2" }))).toBe(true);
    expect(isCountedTicket(makeTicket({ triageDecision: "auto_accept", status: "in_progress", assignedTo: "agent-3" }))).toBe(true);

    // Resolved or closed without manual review -> not counted
    expect(isCountedTicket(makeTicket({ triageDecision: "auto_accept", status: "resolved", assignedTo: "agent-1" }))).toBe(false);
    expect(isCountedTicket(makeTicket({ triageDecision: "auto_accept", status: "closed", assignedTo: "agent-1" }))).toBe(false);

    // Unassigned auto-accepted -> not counted
    expect(isCountedTicket(makeTicket({ triageDecision: "auto_accept", status: "open", assignedTo: null }))).toBe(false);

    // Unknown agent ID (e.g. agent-99) -> not counted
    expect(isCountedTicket(makeTicket({ triageDecision: "auto_accept", status: "open", assignedTo: "agent-99" }))).toBe(false);
  });
});
