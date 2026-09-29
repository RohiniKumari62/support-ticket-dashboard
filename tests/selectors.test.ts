import { describe, expect, it } from "vitest";
import { makeStore } from "@/lib/store/store";
import { ticketsSeeded } from "@/lib/store/tickets-slice";
import { agentSelected } from "@/lib/store/agent-slice";
import {
  claimTicketThunk,
  changeStatusThunk,
  reviewTicketThunk,
} from "@/lib/store/tickets-thunks";
import {
  selectMyTicketsCount,
  selectReviewCount,
  selectReviewQueue,
  selectTicketsById,
} from "@/lib/store/tickets-selectors";
import type { Ticket } from "@/types/ticket";

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
    triageDecision: "manual_review",
    reviewReason: "confidence_low",
    dataIssues: [],
    ...overrides,
  };
}

describe("Redux Selectors and Derived Counts", () => {
  it("selectMyTicketsCount counts only open/in_progress tickets of current agent", () => {
    const store = makeStore();
    const tickets: Ticket[] = [
      makeSampleTicket({ id: "T-1", assignedTo: "agent-1", status: "open" }),
      makeSampleTicket({ id: "T-2", assignedTo: "agent-1", status: "in_progress" }),
      makeSampleTicket({ id: "T-3", assignedTo: "agent-1", status: "resolved" }), // resolved not counted
      makeSampleTicket({ id: "T-4", assignedTo: "agent-1", status: "closed" }), // closed not counted
      makeSampleTicket({ id: "T-5", assignedTo: "agent-2", status: "open" }), // Rahul's ticket
      makeSampleTicket({ id: "T-6", assignedTo: null, assignedToUnknown: "agent-99", status: "open" }), // unknown agent counts for nobody
    ];
    store.dispatch(ticketsSeeded({ tickets }));

    // For Priya (agent-1)
    expect(selectMyTicketsCount(store.getState())).toBe(2);

    // Switch to Rahul (agent-2)
    store.dispatch(agentSelected("agent-2"));
    expect(selectMyTicketsCount(store.getState())).toBe(1);

    // Switch to Meera (agent-3)
    store.dispatch(agentSelected("agent-3"));
    expect(selectMyTicketsCount(store.getState())).toBe(0);
  });

  it("selectMyTicketsCount reacts to optimistic claim and rollback", () => {
    const store = makeStore();
    const t = makeSampleTicket({ id: "T-1", assignedTo: null, status: "open" });
    store.dispatch(ticketsSeeded({ tickets: [t] }));

    expect(selectMyTicketsCount(store.getState())).toBe(0);

    // Optimistic pending claim
    store.dispatch(claimTicketThunk.pending("req-1", { ticketId: "T-1", agentId: "agent-1" }));
    expect(selectMyTicketsCount(store.getState())).toBe(1);

    // Rollback rejected claim
    store.dispatch(claimTicketThunk.rejected(new Error("failed"), "req-1", { ticketId: "T-1", agentId: "agent-1" }));
    expect(selectMyTicketsCount(store.getState())).toBe(0);
  });

  it("resolving a ticket decrements My tickets count", () => {
    const store = makeStore();
    const t = makeSampleTicket({ id: "T-1", assignedTo: "agent-1", status: "in_progress" });
    store.dispatch(ticketsSeeded({ tickets: [t] }));

    expect(selectMyTicketsCount(store.getState())).toBe(1);

    // Optimistic status transition to resolved
    store.dispatch(changeStatusThunk.pending("req-1", { ticketId: "T-1", status: "resolved", agentId: "agent-1" }));
    expect(selectMyTicketsCount(store.getState())).toBe(0);
  });

  it("selectReviewCount and selectReviewQueue drop immediately on review and restore on failure", () => {
    const store = makeStore();
    const t = makeSampleTicket({
      id: "T-1",
      triageDecision: "manual_review",
      humanReview: null,
    });
    store.dispatch(ticketsSeeded({ tickets: [t] }));

    expect(selectReviewCount(store.getState())).toBe(1);
    expect(selectReviewQueue(store.getState()).length).toBe(1);

    // Optimistic review pending
    store.dispatch(
      reviewTicketThunk.pending("req-1", {
        ticketId: "T-1",
        decision: { type: "accept" },
        reviewerId: "agent-1",
      })
    );

    expect(selectReviewCount(store.getState())).toBe(0);
    expect(selectReviewQueue(store.getState()).length).toBe(0);

    // Rejection / failure rollback
    store.dispatch(
      reviewTicketThunk.rejected(new Error("failed"), "req-1", {
        ticketId: "T-1",
        decision: { type: "accept" },
        reviewerId: "agent-1",
      })
    );

    expect(selectReviewCount(store.getState())).toBe(1);
    expect(selectReviewQueue(store.getState())[0].id).toBe("T-1");
  });

  it("preserves ticket object referential identity of unchanged tickets when one ticket updates", () => {
    const store = makeStore();
    const t1 = makeSampleTicket({ id: "T-1", assignedTo: null });
    const t2 = makeSampleTicket({ id: "T-2", assignedTo: null });
    store.dispatch(ticketsSeeded({ tickets: [t1, t2] }));

    const initialT2 = selectTicketsById(store.getState())["T-2"];

    // Update T-1
    store.dispatch(claimTicketThunk.pending("req-1", { ticketId: "T-1", agentId: "agent-1" }));

    const nextT2 = selectTicketsById(store.getState())["T-2"];
    // T-2 reference is preserved
    expect(initialT2).toBe(nextT2);
  });
});
