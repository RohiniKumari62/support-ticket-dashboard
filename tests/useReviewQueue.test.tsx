import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { useReviewQueue } from "@/components/review/useReviewQueue";
import { makeStore } from "@/lib/store/store";
import { ticketsSeeded } from "@/lib/store/tickets-slice";
import type { ApiResult, TicketsApiClient } from "@/lib/api/tickets-client";
import type { Ticket } from "@/types/ticket";

function createTicket(id: string, overrides: Partial<Ticket> = {}): Ticket {
  return {
    id,
    customerId: "C-1",
    plan: "pro",
    subject: `Ticket ${id}`,
    body: "Details",
    attachmentUrl: null,
    createdAt: "2026-09-20T10:00:00Z",
    status: "open",
    assignedTo: null,
    assignedToUnknown: null,
    category: "billing",
    priority: "P2",
    aiPriority: null,
    summary: "Summary",
    triageDecision: "manual_review",
    reviewReason: "flagged_input",
    dataIssues: [],
    humanReview: null,
    version: 1,
    updatedAt: "2026-09-20T10:00:00Z",
    ...overrides,
  };
}

function createWrapper(store: ReturnType<typeof makeStore>) {
  return function StoreWrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

describe("useReviewQueue", () => {
  const currentAgent = "agent-1";

  it("accept removes the ticket from visible queue immediately, stays removed after ok", async () => {
    let resolveApi: (val: ApiResult<Ticket>) => void;
    const mockApi: TicketsApiClient = {
      claimTicket: vi.fn(),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveApi = resolve;
          })
      ),
    };

    const t1 = createTicket("T-1");
    const t2 = createTicket("T-2");

    const store = makeStore(undefined, { api: mockApi });
    store.dispatch(ticketsSeeded({ tickets: [t1, t2] }));

    const { result } = renderHook(
      () =>
        useReviewQueue({
          initialTickets: [t1, t2],
          currentAgentId: currentAgent,
          api: mockApi,
        }),
      { wrapper: createWrapper(store) }
    );

    expect(result.current.remainingCount).toBe(2);

    let acceptPromise: Promise<void>;
    act(() => {
      acceptPromise = result.current.accept("T-1");
    });

    // Optimistic: T-1 removed from visible queue immediately
    expect(result.current.remainingCount).toBe(1);
    expect(result.current.tickets.map((i) => i.id)).toEqual(["T-2"]);

    // Resolve API
    await act(async () => {
      resolveApi!({
        ok: true,
        ticket: {
          ...t1,
          humanReview: { action: "accepted", reviewedBy: currentAgent, note: null },
        },
      });
      await acceptPromise;
    });

    expect(result.current.remainingCount).toBe(1);
    expect(result.current.feedback?.kind).toBe("success");
    expect(result.current.feedback?.text).toContain("T-1 accepted");
  });

  it("network failure restores the ticket in the same position with the draft kept and shows the error", async () => {
    const mockApi: TicketsApiClient = {
      claimTicket: vi.fn(),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: vi.fn().mockResolvedValue({
        ok: false,
        code: "network",
        message: "Network error",
      }),
    };

    const t1 = createTicket("T-1");
    const t2 = createTicket("T-2");

    const store = makeStore(undefined, { api: mockApi });
    store.dispatch(ticketsSeeded({ tickets: [t1, t2] }));

    const { result } = renderHook(
      () =>
        useReviewQueue({
          initialTickets: [t1, t2],
          currentAgentId: currentAgent,
          api: mockApi,
        }),
      { wrapper: createWrapper(store) }
    );

    const changeInput = {
      category: "bug" as const,
      priority: "P1" as const,
      reason: "This is a valid long reason for changing.",
    };

    await act(async () => {
      await result.current.change("T-1", changeInput);
    });

    // Restored in same position (first)
    expect(result.current.remainingCount).toBe(2);
    expect(result.current.tickets.map((i) => i.id)).toEqual(["T-1", "T-2"]);

    expect(result.current.itemErrors["T-1"]).toBe("Network error");
    expect(result.current.drafts["T-1"]).toEqual(changeInput);
    expect(result.current.feedback?.kind).toBe("error");
  });

  it("conflict where server ticket was already handled keeps the ticket removed", async () => {
    const mockApi: TicketsApiClient = {
      claimTicket: vi.fn(),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: vi.fn().mockResolvedValue({
        ok: false,
        code: "conflict",
        message: "This ticket was already handled.",
        ticket: createTicket("T-1", {
          humanReview: { action: "accepted", reviewedBy: "agent-2", note: null },
        }),
      }),
    };

    const t1 = createTicket("T-1");
    const store = makeStore(undefined, { api: mockApi });
    store.dispatch(ticketsSeeded({ tickets: [t1] }));

    const { result } = renderHook(
      () =>
        useReviewQueue({
          initialTickets: [t1],
          currentAgentId: currentAgent,
          api: mockApi,
        }),
      { wrapper: createWrapper(store) }
    );

    await act(async () => {
      await result.current.accept("T-1");
    });

    expect(result.current.remainingCount).toBe(0);
    expect(result.current.feedback?.kind).toBe("error");
  });

  it("DUPLICATE CLICK on Accept calls the injected api exactly once", async () => {
    let resolveApi: (val: ApiResult<Ticket>) => void;
    const submitReviewFn = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveApi = resolve;
        })
    );

    const mockApi: TicketsApiClient = {
      claimTicket: vi.fn(),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: submitReviewFn,
    };

    const t1 = createTicket("T-1");
    const store = makeStore(undefined, { api: mockApi });
    store.dispatch(ticketsSeeded({ tickets: [t1] }));

    const { result } = renderHook(
      () =>
        useReviewQueue({
          initialTickets: [t1],
          currentAgentId: currentAgent,
          api: mockApi,
        }),
      { wrapper: createWrapper(store) }
    );

    act(() => {
      result.current.accept("T-1");
      result.current.accept("T-1"); // Rapid duplicate click
    });

    expect(submitReviewFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveApi!({ ok: true, ticket: t1 });
    });
  });

  it("two different tickets can be saved concurrently", async () => {
    const submitReviewFn = vi.fn().mockImplementation(
      (ticket: Ticket) =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ ok: true, ticket });
          }, 50);
        })
    );

    const mockApi: TicketsApiClient = {
      claimTicket: vi.fn(),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: submitReviewFn,
    };

    const t1 = createTicket("T-1");
    const t2 = createTicket("T-2");
    const store = makeStore(undefined, { api: mockApi });
    store.dispatch(ticketsSeeded({ tickets: [t1, t2] }));

    const { result } = renderHook(
      () =>
        useReviewQueue({
          initialTickets: [t1, t2],
          currentAgentId: currentAgent,
          api: mockApi,
        }),
      { wrapper: createWrapper(store) }
    );

    act(() => {
      result.current.accept("T-1");
      result.current.accept("T-2");
    });

    expect(submitReviewFn).toHaveBeenCalledTimes(2);
    expect(result.current.remainingCount).toBe(0);
  });

  it("changing AI priority P0 to P1 saves successfully, preserves original aiPriority in aiPriority, stores reason, and leaves queue", async () => {
    let capturedTicket: Ticket | null = null;
    const mockApi: TicketsApiClient = {
      claimTicket: vi.fn(),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: vi.fn().mockImplementation(async (ticket: Ticket, decision, reviewerId) => {
        capturedTicket = ticket;
        // Verify ticket state passed into submitReview does NOT have humanReview already set
        expect(ticket.humanReview).toBeNull();
        expect(ticket.triageDecision).toBe("manual_review");

        return {
          ok: true,
          ticket: {
            ...ticket,
            category: decision.type === "change" ? decision.category : ticket.category,
            priority: decision.type === "change" ? decision.priority : ticket.priority,
            aiPriority: ticket.priority, // Preserved P0
            humanReview: {
              action: "changed" as const,
              reviewedBy: reviewerId,
              note: decision.type === "change" ? decision.reason : null,
            },
          },
        };
      }),
    };

    const p0Ticket = createTicket("T-P0", {
      priority: "P0",
      aiPriority: null,
      triageDecision: "manual_review",
      humanReview: null,
    });

    const store = makeStore(undefined, { api: mockApi });
    store.dispatch(ticketsSeeded({ tickets: [p0Ticket] }));

    const { result } = renderHook(
      () =>
        useReviewQueue({
          initialTickets: [p0Ticket],
          currentAgentId: currentAgent,
          api: mockApi,
        }),
      { wrapper: createWrapper(store) }
    );

    expect(result.current.remainingCount).toBe(1);

    await act(async () => {
      await result.current.change("T-P0", {
        category: "bug",
        priority: "P1",
        reason: "Priority adjusted based on actual impact.",
      });
    });

    // Check that submitReview was called
    expect(mockApi.submitReview).toHaveBeenCalledTimes(1);
    expect(capturedTicket).not.toBeNull();

    // Verify ticket leaves the manual review queue
    expect(result.current.remainingCount).toBe(0);
    expect(result.current.feedback?.kind).toBe("success");

    // Verify Redux store state
    const savedTicket = store.getState().tickets.byId["T-P0"];
    expect(savedTicket.priority).toBe("P1");
    expect(savedTicket.aiPriority).toBe("P0");
    expect(savedTicket.humanReview?.action).toBe("changed");
    expect(savedTicket.humanReview?.note).toBe("Priority adjusted based on actual impact.");
  });

  it("DUPLICATE CLICK on Change calls submitReview only once", async () => {
    let resolveApi: (val: ApiResult<Ticket>) => void;
    const submitReviewFn = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveApi = resolve;
        })
    );

    const mockApi: TicketsApiClient = {
      claimTicket: vi.fn(),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: submitReviewFn,
    };

    const t1 = createTicket("T-P0", { priority: "P0" });
    const store = makeStore(undefined, { api: mockApi });
    store.dispatch(ticketsSeeded({ tickets: [t1] }));

    const { result } = renderHook(
      () =>
        useReviewQueue({
          initialTickets: [t1],
          currentAgentId: currentAgent,
          api: mockApi,
        }),
      { wrapper: createWrapper(store) }
    );

    const changeInput = {
      category: "bug" as const,
      priority: "P1" as const,
      reason: "Priority adjusted based on actual impact.",
    };

    act(() => {
      result.current.change("T-P0", changeInput);
      result.current.change("T-P0", changeInput); // Rapid duplicate click
    });

    expect(submitReviewFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveApi!({
        ok: true,
        ticket: {
          ...t1,
          priority: "P1",
          aiPriority: "P0",
          humanReview: { action: "changed", reviewedBy: currentAgent, note: changeInput.reason },
        },
      });
    });
  });
});
