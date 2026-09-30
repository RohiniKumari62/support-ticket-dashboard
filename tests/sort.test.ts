import { describe, it, expect } from "vitest";
import { sortTickets } from "@/lib/tickets/sort";
import type { Ticket } from "@/types/ticket";

function createMockTicket(
  id: string,
  createdAt: string | null,
  issues: Ticket["dataIssues"] = []
): Ticket {
  return {
    id,
    customerId: "C-1",
    plan: "pro",
    subject: `Ticket ${id}`,
    body: "Body",
    attachmentUrl: null,
    createdAt,
    status: "open",
    assignedTo: null,
    assignedToUnknown: null,
    category: "billing",
    priority: "P2",
    aiPriority: null,
    summary: null,
    triageDecision: "auto_accept",
    reviewReason: null,
    dataIssues: issues,
    humanReview: null,
    version: 1,
    updatedAt: createdAt ?? "2026-09-20T09:00:00.000Z",
  };
}

describe("lib/tickets/sort", () => {
  it("sorts normal tickets newest first by createdAt", () => {
    const t1 = createMockTicket("T-1", "2026-09-20T09:00:00.000Z");
    const t2 = createMockTicket("T-2", "2026-09-21T10:00:00.000Z");
    const t3 = createMockTicket("T-3", "2026-09-20T14:00:00.000Z");

    const sorted = sortTickets([t1, t2, t3]);
    expect(sorted.map((t) => t.id)).toEqual(["T-2", "T-3", "T-1"]);
  });

  it("places future-dated and invalid-date tickets after normal tickets", () => {
    const normalOlder = createMockTicket("T-NormalOld", "2026-09-20T08:00:00.000Z");
    const normalNewer = createMockTicket("T-NormalNew", "2026-09-21T12:00:00.000Z");
    const futureTicket = createMockTicket(
      "T-Future",
      "2027-01-01T00:00:00.000Z",
      ["future_created_at"]
    );
    const invalidTicket = createMockTicket("T-Invalid", null, [
      "invalid_created_at",
    ]);

    const sorted = sortTickets([
      futureTicket,
      normalOlder,
      invalidTicket,
      normalNewer,
    ]);

    // Normal tickets should come first, then future/invalid tickets
    expect(sorted[0].id).toBe("T-NormalNew");
    expect(sorted[1].id).toBe("T-NormalOld");
    expect(sorted.slice(2).map((t) => t.id)).toEqual(
      expect.arrayContaining(["T-Future", "T-Invalid"])
    );
  });
});
