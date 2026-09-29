import { describe, expect, it, vi } from "vitest";
import { makeStore } from "@/lib/store/store";
import { ticketsSeeded } from "@/lib/store/tickets-slice";
import { bulkRunThunk } from "@/lib/store/tickets-thunks";
import { selectMyTicketsCount } from "@/lib/store/tickets-selectors";
import { getBulkEligibility } from "@/lib/tickets/bulk";
import type { Ticket } from "@/types/ticket";
import type { TicketsApiClient } from "@/lib/api/tickets-client";

function makeSampleTicket(overrides?: Partial<Ticket>): Ticket {
  return {
    id: "T-1",
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
    aiPriority: "P1",
    summary: "Summary",
    triageDecision: "auto_accept",
    reviewReason: null,
    dataIssues: [],
    ...overrides,
  };
}

describe("Bulk actions and bulkRunThunk", () => {
  it("getBulkEligibility accurately determines eligibility for claim and status", () => {
    const openUnassigned = makeSampleTicket({ id: "T-1", status: "open", assignedTo: null });
    const openAssignedPriya = makeSampleTicket({ id: "T-2", status: "open", assignedTo: "agent-1" });
    const openAssignedRahul = makeSampleTicket({ id: "T-3", status: "open", assignedTo: "agent-2" });
    const closed = makeSampleTicket({ id: "T-4", status: "closed", assignedTo: null });
    const inProgress = makeSampleTicket({ id: "T-5", status: "in_progress", assignedTo: "agent-1" });

    // Claim checks
    expect(getBulkEligibility("claim", openUnassigned, "agent-1")).toEqual({ eligible: true });
    expect(getBulkEligibility("claim", openAssignedPriya, "agent-1")).toEqual({
      eligible: false,
      reason: "Already assigned to you",
    });
    expect(getBulkEligibility("claim", openAssignedRahul, "agent-1")).toEqual({
      eligible: false,
      reason: "Already assigned to Rahul",
    });
    expect(getBulkEligibility("claim", closed, "agent-1")).toEqual({
      eligible: false,
      reason: "Closed tickets can't be changed",
    });
    expect(getBulkEligibility("claim", inProgress, "agent-1")).toEqual({
      eligible: false,
      reason: "Only open tickets can be claimed",
    });

    // Status checks
    expect(getBulkEligibility("status", inProgress, "agent-1", "resolved")).toEqual({ eligible: true });
    expect(getBulkEligibility("status", openUnassigned, "agent-1", "in_progress")).toEqual({
      eligible: false,
      reason: "Claim this ticket first",
    });
    expect(getBulkEligibility("status", openAssignedRahul, "agent-1", "in_progress")).toEqual({
      eligible: false,
      reason: "Assigned to Rahul",
    });
    expect(getBulkEligibility("status", inProgress, "agent-1", "in_progress")).toEqual({
      eligible: false,
      reason: "Already in in progress status",
    });
  });

  it("bulk claim executes eligible tickets concurrently, handles partial failures and skips ineligible ones", async () => {
    const t1 = makeSampleTicket({ id: "T-1", status: "open", assignedTo: null });
    const t2 = makeSampleTicket({ id: "T-2", status: "open", assignedTo: null });
    const t3 = makeSampleTicket({ id: "T-3", status: "open", assignedTo: "agent-2" }); // already assigned to Rahul -> skipped

    const fakeApi: TicketsApiClient = {
      claimTicket: vi.fn().mockImplementation(async (id: string, agentId: string) => {
        if (id === "T-2") {
          return {
            ok: false,
            code: "conflict",
            message: "Conflict",
            assignedTo: "agent-2",
          };
        }
        return {
          ok: true,
          ticket: { ...t1, assignedTo: agentId },
        };
      }),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: vi.fn(),
    };

    const store = makeStore(undefined, { api: fakeApi });
    store.dispatch(ticketsSeeded({ tickets: [t1, t2, t3] }));

    const resAction = await store.dispatch(
      bulkRunThunk({
        kind: "claim",
        ticketIds: ["T-1", "T-2", "T-3"],
        agentId: "agent-1",
      })
    );

    expect(bulkRunThunk.fulfilled.match(resAction)).toBe(true);
    if (bulkRunThunk.fulfilled.match(resAction)) {
      const results = resAction.payload;
      expect(results.length).toBe(3);
      expect(results[0]).toEqual({
        ticketId: "T-1",
        subject: "Test",
        outcome: "success",
        message: "Claimed",
      });
      expect(results[1].ticketId).toBe("T-2");
      expect(results[1].outcome).toBe("failed");
      expect(results[1].message).toContain("Rahul");
      expect(results[2]).toEqual({
        ticketId: "T-3",
        subject: "Test",
        outcome: "skipped",
        message: "Already assigned to Rahul",
      });
    }

    // Only T-1 and T-2 called API (T-3 was skipped before request)
    expect(fakeApi.claimTicket).toHaveBeenCalledTimes(2);

    // State check: T-1 is assigned to agent-1, T-2 is assigned to agent-2 (winner), T-3 stays agent-2
    expect(store.getState().tickets.byId["T-1"].assignedTo).toBe("agent-1");
    expect(store.getState().tickets.byId["T-2"].assignedTo).toBe("agent-2");
    expect(store.getState().tickets.byId["T-3"].assignedTo).toBe("agent-2");

    // My tickets count is 1 (only T-1)
    expect(selectMyTicketsCount(store.getState())).toBe(1);

    // bulk.running is reset to false
    expect(store.getState().tickets.bulk.running).toBe(false);
  });

  it("blocks duplicate bulk runs while running and rejects > 50 tickets", async () => {
    let resolveApi: (value: { ok: true; ticket: Ticket } | { ok: false; code: "conflict"; message: string; assignedTo?: string }) => void = () => {};
    const apiPromise = new Promise((resolve) => {
      resolveApi = resolve;
    });

    const fakeApi: TicketsApiClient = {
      claimTicket: vi.fn().mockReturnValue(apiPromise),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: vi.fn(),
    };

    const store = makeStore(undefined, { api: fakeApi });
    const t1 = makeSampleTicket({ id: "T-1" });
    store.dispatch(ticketsSeeded({ tickets: [t1] }));

    const firstBulkPromise = store.dispatch(
      bulkRunThunk({ kind: "claim", ticketIds: ["T-1"], agentId: "agent-1" })
    );

    // Second bulk run while first is in flight
    const secondBulkAction = await store.dispatch(
      bulkRunThunk({ kind: "claim", ticketIds: ["T-1"], agentId: "agent-1" })
    );

    expect((secondBulkAction.meta as { condition?: boolean }).condition).toBe(true);

    // > 50 IDs rejected by condition
    const hugeList = Array.from({ length: 51 }, (_, i) => `T-${i + 1}`);
    const hugeAction = await store.dispatch(
      bulkRunThunk({ kind: "claim", ticketIds: hugeList, agentId: "agent-1" })
    );
    expect((hugeAction.meta as { condition?: boolean }).condition).toBe(true);

    resolveApi({ ok: true, ticket: { ...t1, assignedTo: "agent-1" } });
    await firstBulkPromise;
  });
});
