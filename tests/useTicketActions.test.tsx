import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { useTicketActions } from "@/components/tickets/detail/useTicketActions";
import { makeStore } from "@/lib/store/store";
import { ticketsSeeded } from "@/lib/store/tickets-slice";
import type { ApiResult, TicketsApiClient } from "@/lib/api/tickets-client";
import type { Ticket } from "@/types/ticket";

function createTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "T-2001",
    customerId: "C-12",
    plan: "pro",
    subject: "Test ticket",
    body: "Body content",
    attachmentUrl: null,
    createdAt: "2026-09-20T09:15:00Z",
    status: "open",
    assignedTo: null,
    assignedToUnknown: null,
    category: "billing",
    priority: "P2",
    aiPriority: null,
    summary: "Summary",
    triageDecision: "auto_accept",
    reviewReason: null,
    dataIssues: [],
    ...overrides,
  };
}

function createWrapper(store: ReturnType<typeof makeStore>) {
  return function StoreWrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

describe("useTicketActions", () => {
  const currentAgent = "agent-1";

  it("optimistic claim: assignee changes immediately, stays after ok result", async () => {
    let resolveApi: (val: ApiResult<Ticket>) => void;
    const mockApi: TicketsApiClient = {
      claimTicket: vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveApi = resolve;
          })
      ),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: vi.fn(),
    };

    const initial = createTicket({ assignedTo: null });
    const store = makeStore(undefined, { api: mockApi });
    store.dispatch(ticketsSeeded({ tickets: [initial] }));

    const { result } = renderHook(
      () =>
        useTicketActions({
          initialTicket: initial,
          currentAgentId: currentAgent,
          api: mockApi,
        }),
      { wrapper: createWrapper(store) }
    );

    expect(result.current.ticket.assignedTo).toBeNull();

    // Trigger claim
    let claimPromise: Promise<void>;
    act(() => {
      claimPromise = result.current.handleClaim();
    });

    // Check optimistic update happened immediately
    expect(result.current.ticket.assignedTo).toBe(currentAgent);
    expect(result.current.pendingAction).toBe("claim");

    // Resolve API
    await act(async () => {
      resolveApi!({
        ok: true,
        ticket: { ...initial, assignedTo: currentAgent },
      });
      await claimPromise;
    });

    expect(result.current.ticket.assignedTo).toBe(currentAgent);
    expect(result.current.pendingAction).toBeNull();
    expect(result.current.feedback).toEqual({
      kind: "success",
      text: "Ticket claimed successfully.",
    });
  });

  it("claim conflict: rolls back, shows the winner and the error text", async () => {
    const mockApi: TicketsApiClient = {
      claimTicket: vi.fn().mockResolvedValue({
        ok: false,
        code: "conflict",
        message: "Conflict",
        assignedTo: "agent-2", // Rahul won
      }),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: vi.fn(),
    };

    const initial = createTicket({ assignedTo: null });
    const store = makeStore(undefined, { api: mockApi });
    store.dispatch(ticketsSeeded({ tickets: [initial] }));

    const { result } = renderHook(
      () =>
        useTicketActions({
          initialTicket: initial,
          currentAgentId: currentAgent,
          api: mockApi,
        }),
      { wrapper: createWrapper(store) }
    );

    await act(async () => {
      await result.current.handleClaim();
    });

    // Server truth assignedTo = agent-2 applied
    expect(result.current.ticket.assignedTo).toBe("agent-2");
    expect(result.current.feedback?.kind).toBe("error");
    expect(result.current.feedback?.text).toContain("Rahul already claimed this ticket");
  });

  it("claim network failure: rolls back, error message", async () => {
    const mockApi: TicketsApiClient = {
      claimTicket: vi.fn().mockResolvedValue({
        ok: false,
        code: "network",
        message: "Network error. Try again.",
      }),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: vi.fn(),
    };

    const initial = createTicket({ assignedTo: null });
    const store = makeStore(undefined, { api: mockApi });
    store.dispatch(ticketsSeeded({ tickets: [initial] }));

    const { result } = renderHook(
      () =>
        useTicketActions({
          initialTicket: initial,
          currentAgentId: currentAgent,
          api: mockApi,
        }),
      { wrapper: createWrapper(store) }
    );

    await act(async () => {
      await result.current.handleClaim();
    });

    expect(result.current.ticket.assignedTo).toBeNull();
    expect(result.current.feedback?.kind).toBe("error");
    expect(result.current.feedback?.text).toContain("Network error");
  });

  it("DUPLICATE CLICK: two rapid claim clicks call injected api exactly ONCE", async () => {
    let resolveApi: (val: ApiResult<Ticket>) => void;
    const claimFn = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveApi = resolve;
        })
    );

    const mockApi: TicketsApiClient = {
      claimTicket: claimFn,
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: vi.fn(),
    };

    const initial = createTicket({ assignedTo: null });
    const store = makeStore(undefined, { api: mockApi });
    store.dispatch(ticketsSeeded({ tickets: [initial] }));

    const { result } = renderHook(
      () =>
        useTicketActions({
          initialTicket: initial,
          currentAgentId: currentAgent,
          api: mockApi,
        }),
      { wrapper: createWrapper(store) }
    );

    act(() => {
      result.current.handleClaim();
      result.current.handleClaim(); // Rapid duplicate click
    });

    expect(claimFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveApi!({ ok: true, ticket: { ...initial, assignedTo: currentAgent } });
    });
  });

  it("status click while a claim is pending is ignored (single lock)", async () => {
    let resolveClaim: (val: ApiResult<Ticket>) => void;
    const claimFn = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveClaim = resolve;
        })
    );
    const statusFn = vi.fn();

    const mockApi: TicketsApiClient = {
      claimTicket: claimFn,
      changeTicketStatus: statusFn,
      retriageTicket: vi.fn(),
      submitReview: vi.fn(),
    };

    const initial = createTicket({ assignedTo: null });
    const store = makeStore(undefined, { api: mockApi });
    store.dispatch(ticketsSeeded({ tickets: [initial] }));

    const { result } = renderHook(
      () =>
        useTicketActions({
          initialTicket: initial,
          currentAgentId: currentAgent,
          api: mockApi,
        }),
      { wrapper: createWrapper(store) }
    );

    act(() => {
      result.current.handleClaim();
      result.current.handleStatusChange("in_progress"); // Ignored while claim in flight
    });

    expect(claimFn).toHaveBeenCalledTimes(1);
    expect(statusFn).not.toHaveBeenCalled();

    await act(async () => {
      resolveClaim!({ ok: true, ticket: { ...initial, assignedTo: currentAgent } });
    });
  });

  it("status optimistic success and failure rollback", async () => {
    // 1. Success
    const mockSuccessApi: TicketsApiClient = {
      claimTicket: vi.fn(),
      changeTicketStatus: vi.fn().mockResolvedValue({
        ok: true,
        ticket: createTicket({ status: "in_progress", assignedTo: currentAgent }),
      }),
      retriageTicket: vi.fn(),
      submitReview: vi.fn(),
    };

    const initial = createTicket({ status: "open", assignedTo: currentAgent });
    const store = makeStore(undefined, { api: mockSuccessApi });
    store.dispatch(ticketsSeeded({ tickets: [initial] }));

    const { result } = renderHook(
      () =>
        useTicketActions({
          initialTicket: initial,
          currentAgentId: currentAgent,
          api: mockSuccessApi,
        }),
      { wrapper: createWrapper(store) }
    );

    await act(async () => {
      await result.current.handleStatusChange("in_progress");
    });

    expect(result.current.ticket.status).toBe("in_progress");
    expect(result.current.feedback?.kind).toBe("success");

    // 2. Failure rollback
    const mockFailApi: TicketsApiClient = {
      claimTicket: vi.fn(),
      changeTicketStatus: vi.fn().mockResolvedValue({
        ok: false,
        code: "network",
        message: "Status update failed",
      }),
      retriageTicket: vi.fn(),
      submitReview: vi.fn(),
    };

    const storeFail = makeStore(undefined, { api: mockFailApi });
    storeFail.dispatch(ticketsSeeded({ tickets: [initial] }));

    const { result: failResult } = renderHook(
      () =>
        useTicketActions({
          initialTicket: initial,
          currentAgentId: currentAgent,
          api: mockFailApi,
        }),
      { wrapper: createWrapper(storeFail) }
    );

    await act(async () => {
      await failResult.current.handleStatusChange("in_progress");
    });

    expect(failResult.current.ticket.status).toBe("open");
    expect(failResult.current.feedback?.kind).toBe("error");
  });

  it("Re-run AI: success applies validated result; unprocessable shows error", async () => {
    const updatedTicket = createTicket({
      category: "billing",
      summary: "Updated summary",
    });

    const mockApi: TicketsApiClient = {
      claimTicket: vi.fn(),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi
        .fn()
        .mockResolvedValueOnce({ ok: true, ticket: updatedTicket })
        .mockResolvedValueOnce({
          ok: false,
          code: "unprocessable",
          message: "There isn't enough content to analyse.",
        }),
      submitReview: vi.fn(),
    };

    const initial = createTicket();
    const store = makeStore(undefined, { api: mockApi });
    store.dispatch(ticketsSeeded({ tickets: [initial] }));

    const { result } = renderHook(
      () =>
        useTicketActions({
          initialTicket: initial,
          currentAgentId: currentAgent,
          api: mockApi,
        }),
      { wrapper: createWrapper(store) }
    );

    // 1. Success
    await act(async () => {
      await result.current.handleRetriage();
    });

    expect(result.current.ticket.category).toBe("billing");
    expect(result.current.ticket.summary).toBe("Updated summary");
    expect(result.current.feedback?.kind).toBe("success");

    // 2. Unprocessable
    await act(async () => {
      await result.current.handleRetriage();
    });

    expect(result.current.feedback?.kind).toBe("error");
    expect(result.current.feedback?.text).toBe(
      "There isn't enough content to analyse."
    );
  });
});
