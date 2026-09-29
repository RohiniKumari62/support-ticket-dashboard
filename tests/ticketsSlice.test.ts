import { describe, expect, it, vi } from "vitest";
import { makeStore } from "@/lib/store/store";
import { ticketsSeeded, ticketReceivedFromServer } from "@/lib/store/tickets-slice";
import {
  claimTicketThunk,
  changeStatusThunk,
  reviewTicketThunk,
  retriageTicketThunk,
} from "@/lib/store/tickets-thunks";
import type { Ticket } from "@/types/ticket";
import type { TicketsApiClient } from "@/lib/api/tickets-client";

function makeSampleTicket(overrides?: Partial<Ticket>): Ticket {
  return {
    id: "T-2001",
    customerId: "cust-1",
    plan: "pro",
    subject: "Login issue",
    body: "Cannot log in",
    attachmentUrl: null,
    createdAt: "2026-09-20T10:00:00.000Z",
    status: "open",
    assignedTo: null,
    assignedToUnknown: null,
    category: "account_access",
    priority: "P1",
    aiPriority: "P1",
    summary: "Login bug",
    triageDecision: "manual_review",
    reviewReason: "confidence_low",
    dataIssues: [],
    ...overrides,
  };
}

describe("Tickets slice and thunks", () => {
  it("claimTicketThunk updates state optimistically before API resolves, keeps on success", async () => {
    let resolveApi: (value: { ok: true; ticket: Ticket } | { ok: false; code: string; message: string; assignedTo?: string }) => void = () => {};
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
    const initial = makeSampleTicket({ id: "T-2001", assignedTo: null });
    store.dispatch(ticketsSeeded({ tickets: [initial] }));

    // Dispatch claim
    const thunkPromise = store.dispatch(
      claimTicketThunk({ ticketId: "T-2001", agentId: "agent-1" })
    );

    // Synchronously right after dispatch, before API resolves:
    expect(store.getState().tickets.byId["T-2001"].assignedTo).toBe("agent-1");
    expect(store.getState().tickets.inFlight["T-2001"]).toBeDefined();
    expect(store.getState().tickets.inFlight["T-2001"].action).toBe("claim");

    // Resolve API with success
    resolveApi({
      ok: true,
      ticket: { ...initial, assignedTo: "agent-1" },
    });

    await thunkPromise;

    expect(store.getState().tickets.byId["T-2001"].assignedTo).toBe("agent-1");
    expect(store.getState().tickets.inFlight["T-2001"]).toBeUndefined();
  });

  it("claim conflict rolls back optimistic assignment and applies server winner", async () => {
    const fakeApi: TicketsApiClient = {
      claimTicket: vi.fn().mockResolvedValue({
        ok: false,
        code: "conflict",
        message: "Already claimed by Rahul",
        assignedTo: "agent-2",
        ticket: makeSampleTicket({ id: "T-2001", assignedTo: "agent-2" }),
      }),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: vi.fn(),
    };

    const store = makeStore(undefined, { api: fakeApi });
    const initial = makeSampleTicket({ id: "T-2001", assignedTo: null });
    store.dispatch(ticketsSeeded({ tickets: [initial] }));

    await store.dispatch(
      claimTicketThunk({ ticketId: "T-2001", agentId: "agent-1" })
    );

    // Rollback applied winner
    expect(store.getState().tickets.byId["T-2001"].assignedTo).toBe("agent-2");
    expect(store.getState().tickets.inFlight["T-2001"]).toBeUndefined();
  });

  it("claim network failure rolls back to exact snapshot", async () => {
    const fakeApi: TicketsApiClient = {
      claimTicket: vi.fn().mockResolvedValue({
        ok: false,
        code: "network",
        message: "Failed to connect",
      }),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: vi.fn(),
    };

    const store = makeStore(undefined, { api: fakeApi });
    const initial = makeSampleTicket({ id: "T-2001", assignedTo: null });
    store.dispatch(ticketsSeeded({ tickets: [initial] }));

    await store.dispatch(
      claimTicketThunk({ ticketId: "T-2001", agentId: "agent-1" })
    );

    expect(store.getState().tickets.byId["T-2001"].assignedTo).toBeNull();
    expect(store.getState().tickets.inFlight["T-2001"]).toBeUndefined();
  });

  it("blocks duplicate dispatch on the same ticket while in-flight", async () => {
    let resolveApi: (value: { ok: true; ticket: Ticket } | { ok: false; code: string; message: string }) => void = () => {};
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
    const initial = makeSampleTicket({ id: "T-2001", assignedTo: null });
    store.dispatch(ticketsSeeded({ tickets: [initial] }));

    // First click
    const firstActionPromise = store.dispatch(
      claimTicketThunk({ ticketId: "T-2001", agentId: "agent-1" })
    );

    // Immediate second click (duplicate)
    const secondAction = await store.dispatch(
      claimTicketThunk({ ticketId: "T-2001", agentId: "agent-1" })
    );

    expect((secondAction.meta as { condition?: boolean }).condition).toBe(true);
    expect(fakeApi.claimTicket).toHaveBeenCalledTimes(1);

    // Also a status thunk while claim is in flight is ignored
    const statusAction = await store.dispatch(
      changeStatusThunk({ ticketId: "T-2001", status: "in_progress", agentId: "agent-1" })
    );
    expect((statusAction.meta as { condition?: boolean }).condition).toBe(true);

    resolveApi({ ok: true, ticket: { ...initial, assignedTo: "agent-1" } });
    await firstActionPromise;
  });

  it("changeStatusThunk handles allowed transitions and rolls back on failure", async () => {
    const fakeApi: TicketsApiClient = {
      claimTicket: vi.fn(),
      changeTicketStatus: vi.fn().mockResolvedValue({
        ok: false,
        code: "network",
        message: "Network failure",
      }),
      retriageTicket: vi.fn(),
      submitReview: vi.fn(),
    };

    const store = makeStore(undefined, { api: fakeApi });
    const initial = makeSampleTicket({ id: "T-2001", status: "open", assignedTo: "agent-1" });
    store.dispatch(ticketsSeeded({ tickets: [initial] }));

    await store.dispatch(
      changeStatusThunk({ ticketId: "T-2001", status: "in_progress", agentId: "agent-1" })
    );

    // Rolled back to open
    expect(store.getState().tickets.byId["T-2001"].status).toBe("open");
  });

  it("reviewTicketThunk removes ticket optimistically and rolls back on failure", async () => {
    const fakeApi: TicketsApiClient = {
      claimTicket: vi.fn(),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: vi.fn().mockResolvedValue({
        ok: false,
        code: "network",
        message: "Failed to connect",
      }),
    };

    const store = makeStore(undefined, { api: fakeApi });
    const initial = makeSampleTicket({
      id: "T-2001",
      triageDecision: "manual_review",
      humanReview: null,
    });
    store.dispatch(ticketsSeeded({ tickets: [initial] }));

    await store.dispatch(
      reviewTicketThunk({
        ticketId: "T-2001",
        decision: { type: "accept" },
        reviewerId: "agent-1",
      })
    );

    // Restored on failure
    expect(store.getState().tickets.byId["T-2001"].humanReview).toBeNull();
  });

  it("retriageTicketThunk sets inFlight without mutating ticket until resolved", async () => {
    let resolveApi: (value: { ok: true; ticket: Ticket } | { ok: false; code: string; message: string }) => void = () => {};
    const apiPromise = new Promise((resolve) => {
      resolveApi = resolve;
    });

    const fakeApi: TicketsApiClient = {
      claimTicket: vi.fn(),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn().mockReturnValue(apiPromise),
      submitReview: vi.fn(),
    };

    const store = makeStore(undefined, { api: fakeApi });
    const initial = makeSampleTicket({ id: "T-2001", priority: "P3" });
    store.dispatch(ticketsSeeded({ tickets: [initial] }));

    const retriagePromise = store.dispatch(retriageTicketThunk({ ticketId: "T-2001" }));

    // In flight is set, but priority is NOT optimistically changed
    expect(store.getState().tickets.inFlight["T-2001"].action).toBe("retriage");
    expect(store.getState().tickets.byId["T-2001"].priority).toBe("P3");

    resolveApi({
      ok: true,
      ticket: { ...initial, priority: "P1" },
    });

    await retriagePromise;

    expect(store.getState().tickets.byId["T-2001"].priority).toBe("P1");
    expect(store.getState().tickets.inFlight["T-2001"]).toBeUndefined();
  });

  it("ticketReceivedFromServer upserts ticket and preserves snapshot when in-flight", () => {
    const store = makeStore();
    const initial = makeSampleTicket({ id: "T-2001", assignedTo: null });
    store.dispatch(ticketsSeeded({ tickets: [initial] }));

    // Dispatch action to put it in flight
    store.dispatch(claimTicketThunk.pending("req-1", { ticketId: "T-2001", agentId: "agent-1" }));

    expect(store.getState().tickets.byId["T-2001"].assignedTo).toBe("agent-1");

    // Server sends an update (e.g. Rahul claimed it)
    const serverUpdate = { ...initial, assignedTo: "agent-2" };
    store.dispatch(ticketReceivedFromServer(serverUpdate));

    // Optimistic view still visible
    expect(store.getState().tickets.byId["T-2001"].assignedTo).toBe("agent-1");
    // But inFlight snapshot was updated to server truth
    expect(store.getState().tickets.inFlight["T-2001"].snapshot.assignedTo).toBe("agent-2");
  });
});
