import { describe, it, expect } from "vitest";
import { reconcileTicket } from "@/lib/tickets/reconcile";
import type { Ticket } from "@/types/ticket";

function createTicket(assignedTo: string | null = null): Ticket {
  return {
    id: "T-2001",
    customerId: "C-12",
    plan: "enterprise",
    subject: "Test",
    body: "Test body",
    attachmentUrl: null,
    createdAt: "2026-09-20T09:15:00Z",
    status: "open",
    assignedTo,
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
    updatedAt: "2026-09-20T09:15:00Z",
  };
}

describe("lib/tickets/reconcile", () => {
  const currentAgent = "agent-1"; // Priya

  it("updates assignee and produces an info notice when another agent claims while viewing", () => {
    const current = createTicket(null);
    const incoming = createTicket("agent-2"); // Rahul

    const result = reconcileTicket(current, incoming, currentAgent);

    expect(result.ticket.assignedTo).toBe("agent-2");
    expect(result.notice).toEqual({
      kind: "info",
      text: "Rahul claimed this ticket while you were viewing it.",
    });
  });

  it("replaces a pending optimistic claim with server truth when another agent won the claim", () => {
    // Current state has optimistic assignedTo = agent-1 with claim in flight
    const current = createTicket("agent-1");
    // Server incoming returns assignedTo = agent-2 (Rahul)
    const incoming = createTicket("agent-2");

    const result = reconcileTicket(current, incoming, currentAgent, {
      isClaimPending: true,
    });

    expect(result.ticket.assignedTo).toBe("agent-2");
    expect(result.notice).toEqual({
      kind: "info",
      text: "Rahul claimed this ticket while you were viewing it.",
    });
  });

  it("confirms own claim unchanged without extra notice", () => {
    const current = createTicket("agent-1");
    const incoming = createTicket("agent-1");

    const result = reconcileTicket(current, incoming, currentAgent);

    expect(result.ticket.assignedTo).toBe("agent-1");
    expect(result.notice).toBeNull();
  });
});
