import { describe, it, expect } from "vitest";
import { isNewer, pickNewer } from "@/lib/tickets/merge";
import type { Ticket } from "@/types/ticket";

function makeFakeTicket(id: string, version: number): Ticket {
  return {
    id,
    customerId: "cust-1",
    plan: "pro",
    subject: "Test",
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
    version,
    updatedAt: "2026-09-20T10:00:00.000Z",
  };
}

describe("merge: isNewer and pickNewer", () => {
  it("isNewer returns true when incoming.version > existing.version", () => {
    const existing = makeFakeTicket("T-1", 1);
    const incoming = makeFakeTicket("T-1", 2);
    expect(isNewer(incoming, existing)).toBe(true);
  });

  it("isNewer returns false when incoming.version <= existing.version", () => {
    const existing = makeFakeTicket("T-1", 2);
    const incomingSame = makeFakeTicket("T-1", 2);
    const incomingOlder = makeFakeTicket("T-1", 1);
    expect(isNewer(incomingSame, existing)).toBe(false);
    expect(isNewer(incomingOlder, existing)).toBe(false);
  });

  it("pickNewer returns higher version", () => {
    const t1 = makeFakeTicket("T-1", 1);
    const t2 = makeFakeTicket("T-1", 2);
    expect(pickNewer(t1, t2)).toBe(t2);
    expect(pickNewer(t2, t1)).toBe(t2);
  });

  it("pickNewer preserves reference identity on tie (returns first arg a)", () => {
    const a = makeFakeTicket("T-1", 2);
    const b = makeFakeTicket("T-1", 2);
    expect(pickNewer(a, b)).toBe(a);
  });
});
