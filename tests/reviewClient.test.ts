import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ticketsApiClient,
  resetMockReviewFailures,
} from "@/lib/api/tickets-client";
import type { Ticket } from "@/types/ticket";

function createTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "T-2003",
    customerId: "C-40",
    plan: "free",
    subject: "Test ticket",
    body: "Body text",
    attachmentUrl: null,
    createdAt: "2026-09-20T10:40:00Z",
    status: "open",
    assignedTo: null,
    assignedToUnknown: null,
    category: "bug",
    priority: "P3",
    aiPriority: null,
    summary: "Summary",
    triageDecision: "manual_review",
    reviewReason: "flagged_input",
    dataIssues: [],
    humanReview: null,
    ...overrides,
  };
}

describe("lib/api/tickets-client submitReview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetMockReviewFailures();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects unknown reviewer ID with validation error", async () => {
    const ticket = createTicket();
    const promise = ticketsApiClient.submitReview(
      ticket,
      { type: "accept" },
      "agent-999"
    );
    vi.advanceTimersByTime(600);
    const res = await promise;

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("validation");
      expect(res.message).toContain("Invalid reviewer ID");
    }
  });

  it("rejects already-handled ticket with conflict error", async () => {
    const ticket = createTicket({
      humanReview: { action: "accepted", reviewedBy: "agent-1", note: null },
    });
    const promise = ticketsApiClient.submitReview(
      ticket,
      { type: "accept" },
      "agent-1"
    );
    vi.advanceTimersByTime(600);
    const res = await promise;

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("conflict");
      expect(res.message).toContain("already handled");
    }
  });

  it("rejects accept on invalid AI values (e.g. T-2004 category and priority null)", async () => {
    const invalidTicket = createTicket({
      id: "T-2004",
      category: null,
      priority: null,
    });
    const promise = ticketsApiClient.submitReview(
      invalidTicket,
      { type: "accept" },
      "agent-1"
    );
    vi.advanceTimersByTime(600);
    const res = await promise;

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("validation");
      expect(res.message).toContain("Invalid AI values cannot be accepted");
    }
  });

  it("rejects short reason on change submission", async () => {
    const ticket = createTicket();
    const promise = ticketsApiClient.submitReview(
      ticket,
      {
        type: "change",
        category: "billing",
        priority: "P1",
        reason: "too short",
      },
      "agent-1"
    );
    vi.advanceTimersByTime(600);
    const res = await promise;

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("validation");
      expect(res.errors?.reason).toBeDefined();
    }
  });

  it("rejects enterprise priority P3 on change submission", async () => {
    const ticket = createTicket({ plan: "enterprise", priority: "P1" });
    const promise = ticketsApiClient.submitReview(
      ticket,
      {
        type: "change",
        category: "billing",
        priority: "P3",
        reason: "Valid reason of sufficient length.",
      },
      "agent-1"
    );
    vi.advanceTimersByTime(600);
    const res = await promise;

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("validation");
      expect(res.errors?.priority).toContain("Enterprise tickets must stay at P1");
    }
  });

  it("T-2004's first submit fails with 'network' and retry succeeds", async () => {
    const ticket = createTicket({
      id: "T-2004", // 2004 % 6 === 0
      category: null,
      priority: null,
    });

    const changeDecision = {
      type: "change" as const,
      category: "billing" as const,
      priority: "P2" as const,
      reason: "Proper classification provided by agent.",
    };

    // 1st attempt: fails with network error
    const promise1 = ticketsApiClient.submitReview(
      ticket,
      changeDecision,
      "agent-1"
    );
    vi.advanceTimersByTime(600);
    const res1 = await promise1;

    expect(res1.ok).toBe(false);
    if (!res1.ok) {
      expect(res1.code).toBe("network");
      expect(res1.message).toContain("Network error");
    }

    // 2nd attempt (retry): succeeds!
    const promise2 = ticketsApiClient.submitReview(
      ticket,
      changeDecision,
      "agent-1"
    );
    vi.advanceTimersByTime(600);
    const res2 = await promise2;

    expect(res2.ok).toBe(true);
    if (res2.ok) {
      expect(res2.ticket.category).toBe("billing");
      expect(res2.ticket.priority).toBe("P2");
      expect(res2.ticket.humanReview?.action).toBe("changed");
    }
  });
});
