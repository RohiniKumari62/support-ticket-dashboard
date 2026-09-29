import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReviewQueue } from "@/components/review/useReviewQueue";
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
    ...overrides,
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

    const { result } = renderHook(() =>
      useReviewQueue({
        initialTickets: [t1, t2],
        currentAgentId: currentAgent,
        api: mockApi,
      })
    );

    expect(result.current.remainingCount).toBe(2);

    let acceptPromise: Promise<void>;
    act(() => {
      acceptPromise = result.current.accept("T-1");
    });

    // Optimistic: T-1 removed from visibleItems immediately
    expect(result.current.remainingCount).toBe(1);
    expect(result.current.visibleItems.map((i) => i.ticket.id)).toEqual(["T-2"]);

    // Resolve API
    await act(async () => {
      resolveApi!({ ok: true, ticket: { ...t1, humanReview: { action: "accepted", reviewedBy: currentAgent, note: null } } });
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

    const { result } = renderHook(() =>
      useReviewQueue({
        initialTickets: [t1, t2],
        currentAgentId: currentAgent,
        api: mockApi,
      })
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
    expect(result.current.visibleItems.map((i) => i.ticket.id)).toEqual(["T-1", "T-2"]);

    const restoredItem = result.current.visibleItems[0];
    expect(restoredItem.error).toBe("Network error");
    expect(restoredItem.draft).toEqual(changeInput);
    expect(result.current.feedback?.kind).toBe("error");
  });

  it("conflict keeps the ticket removed with a message", async () => {
    const mockApi: TicketsApiClient = {
      claimTicket: vi.fn(),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: vi.fn().mockResolvedValue({
        ok: false,
        code: "conflict",
        message: "This ticket was already handled.",
      }),
    };

    const t1 = createTicket("T-1");
    const { result } = renderHook(() =>
      useReviewQueue({
        initialTickets: [t1],
        currentAgentId: currentAgent,
        api: mockApi,
      })
    );

    await act(async () => {
      await result.current.accept("T-1");
    });

    expect(result.current.remainingCount).toBe(0);
    expect(result.current.feedback?.kind).toBe("error");
    expect(result.current.feedback?.text).toContain("already handled");
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
    const { result } = renderHook(() =>
      useReviewQueue({
        initialTickets: [t1],
        currentAgentId: currentAgent,
        api: mockApi,
      })
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

    const { result } = renderHook(() =>
      useReviewQueue({
        initialTickets: [t1, t2],
        currentAgentId: currentAgent,
        api: mockApi,
      })
    );

    act(() => {
      result.current.accept("T-1");
      result.current.accept("T-2");
    });

    expect(submitReviewFn).toHaveBeenCalledTimes(2);
    expect(result.current.remainingCount).toBe(0);
  });
});
