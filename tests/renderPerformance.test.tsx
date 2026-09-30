import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { makeStore } from "@/lib/store/store";
import { ticketsSeeded, ticketReceivedFromServer } from "@/lib/store/tickets-slice";
import { claimTicketThunk } from "@/lib/store/tickets-thunks";
import { agentSelected } from "@/lib/store/agent-slice";
import { pollFailed, pollSucceeded } from "@/lib/store/live-slice";
import { TicketsWorkspace } from "@/components/tickets/TicketsWorkspace";
import type { Ticket } from "@/types/ticket";

// Row render counter tracking renders per ticket ID via the row's Link element
const rowRenderCounts: Record<string, number> = {};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/tickets",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => {
  return {
    default: ({
      children,
      href,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
      const match = String(href).match(/\/tickets\/([^/?#]+)/);
      if (match && match[1]) {
        const id = decodeURIComponent(match[1]);
        rowRenderCounts[id] = (rowRenderCounts[id] || 0) + 1;
      }
      return <a href={href} {...props}>{children}</a>;
    },
  };
});

function createMockTicket(id: string, overrides: Partial<Ticket> = {}): Ticket {
  return {
    id,
    customerId: "C-100",
    plan: "pro",
    subject: `Ticket Subject ${id}`,
    body: `Ticket Body ${id}`,
    attachmentUrl: null,
    createdAt: "2026-09-30T10:00:00.000Z",
    status: "open",
    assignedTo: null,
    assignedToUnknown: null,
    category: "billing",
    priority: "P2",
    aiPriority: null,
    summary: `Summary ${id}`,
    triageDecision: "auto_accept",
    reviewReason: null,
    humanReview: null,
    dataIssues: [],
    version: 1,
    updatedAt: "2026-09-30T10:00:00.000Z",
    ...overrides,
  };
}

describe("Render-Performance Proof (Phase 11)", () => {
  const mockTickets: Ticket[] = [];
  for (let i = 1; i <= 50; i++) {
    mockTickets.push(createMockTicket(`T-${10000 + i}`));
  }

  function setupWorkspace() {
    const store = makeStore();
    store.dispatch(
      ticketsSeeded({
        tickets: mockTickets,
        duplicatesRemoved: 0,
      })
    );

    render(
      <Provider store={store}>
        <TicketsWorkspace
          filters={{
            q: "",
            status: null,
            priority: null,
            category: null,
            decision: null,
          }}
        />
      </Provider>
    );

    return store;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    for (const key of Object.keys(rowRenderCounts)) {
      delete rowRenderCounts[key];
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("(1) dispatching an optimistic claim for ONE ticket re-renders only that ticket's row", () => {
    const store = setupWorkspace();
    const baseline = { ...rowRenderCounts };

    act(() => {
      store.dispatch({
        type: claimTicketThunk.pending.type,
        meta: {
          arg: { ticketId: "T-10001", agentId: "agent-1" },
          requestId: "req-1",
        },
      });
    });

    // T-10001 must re-render
    expect(rowRenderCounts["T-10001"]).toBeGreaterThan(baseline["T-10001"]);

    // All other 49 rows must NOT re-render
    for (let i = 2; i <= 50; i++) {
      const id = `T-${10000 + i}`;
      expect(rowRenderCounts[id]).toBe(baseline[id]);
    }
  });

  it("(2) a live poll response containing the same tickets (equal versions) re-renders nothing", () => {
    const store = setupWorkspace();
    const baseline = { ...rowRenderCounts };

    act(() => {
      // Simulate live poll response with 10 existing tickets having equal version
      for (let i = 1; i <= 10; i++) {
        store.dispatch(ticketReceivedFromServer(mockTickets[i - 1]));
      }
    });

    // Zero rows re-rendered
    for (let i = 1; i <= 50; i++) {
      const id = `T-${10000 + i}`;
      expect(rowRenderCounts[id]).toBe(baseline[id]);
    }
  });

  it("(3) toggling ONE row's checkbox re-renders only that row, not the other rows", () => {
    setupWorkspace();
    const baseline = { ...rowRenderCounts };

    // Toggle T-10005 checkbox
    const checkboxT10005 = screen.getAllByLabelText("Select T-10005")[0];
    act(() => {
      fireEvent.click(checkboxT10005);
    });

    // T-10005 must re-render to reflect selection
    expect(rowRenderCounts["T-10005"]).toBeGreaterThan(baseline["T-10005"]);

    // All other 49 rows must NOT re-render
    for (let i = 1; i <= 50; i++) {
      if (i === 5) continue;
      const id = `T-${10000 + i}`;
      expect(rowRenderCounts[id]).toBe(baseline[id]);
    }
  });

  it("(4) advancing the shared ticker by 1s does not re-render ticket rows", () => {
    setupWorkspace();
    const baseline = { ...rowRenderCounts };

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Rows must NOT re-render because only DeadlineCell subscribes to the ticker
    for (let i = 1; i <= 50; i++) {
      const id = `T-${10000 + i}`;
      expect(rowRenderCounts[id]).toBe(baseline[id]);
    }
  });

  it("(5) changing an unrelated Redux field (agent, live.failures, pending banner count) does not re-render rows", () => {
    const store = setupWorkspace();
    const baseline = { ...rowRenderCounts };

    // Dispatch agent selection change
    act(() => {
      store.dispatch(agentSelected("agent-2"));
    });

    // Dispatch live status failure updates
    act(() => {
      store.dispatch(pollFailed());
      store.dispatch(pollFailed());
    });

    // Dispatch pending new ticket arrival (banner notification)
    act(() => {
      store.dispatch(
        pollSucceeded({
          serverTime: "2026-09-30T10:05:00.000Z",
          instanceId: "inst_1",
          newIds: ["T-99999"],
        })
      );
    });

    // All 50 rows must NOT re-render
    for (let i = 1; i <= 50; i++) {
      const id = `T-${10000 + i}`;
      expect(rowRenderCounts[id]).toBe(baseline[id]);
    }
  });
});
