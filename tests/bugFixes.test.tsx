import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { makeStore } from "@/lib/store/store";
import { countedScopeLoaded, ticketsSeeded } from "@/lib/store/tickets-slice";
import { agentHydrated } from "@/lib/store/agent-slice";
import { DeadlineCell } from "@/components/tickets/DeadlineCell";
import { NavLinks } from "@/components/layout/NavLinks";
import { HeaderCounts } from "@/components/layout/HeaderCounts";
import { ReviewQueue } from "@/components/review/ReviewQueue";
import { buildSeed } from "@/lib/server/seed";
import { TicketStore } from "@/lib/server/ticket-store";
import { selectReviewCount, selectReviewQueue } from "@/lib/store/tickets-selectors";
import { isPendingReview } from "@/lib/tickets/counts";
import type { Priority, Ticket } from "@/types/ticket";

vi.mock("next/navigation", () => ({
  usePathname: () => "/tickets",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

function createTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "T-9999",
    customerId: "C-1",
    plan: "pro",
    subject: "Issue subject",
    body: "Issue body",
    attachmentUrl: null,
    createdAt: "2026-10-01T08:22:00.000Z",
    status: "open",
    assignedTo: null,
    assignedToUnknown: null,
    category: "billing",
    priority: "P1",
    aiPriority: null,
    summary: "Summary",
    triageDecision: "manual_review",
    reviewReason: null,
    humanReview: null,
    dataIssues: [],
    version: 1,
    updatedAt: "2026-10-01T08:22:00.000Z",
    ...overrides,
  };
}

describe("Bug 1 & Bug 2 Verification Tests", () => {
  describe("Bug 1: DeadlineCell SSR/fallback and priority SLA offsets", () => {
    it("renders deadline as exactly created_at + SLA for P0 (1h), P1 (4h), P2 (24h), P3 (72h)", () => {
      const baseCreated = "2026-10-01T08:22:00.000Z";
      const priorities: Array<{
        priority: Priority;
        expectedIso: string;
        expectedFormatted: string;
      }> = [
        {
          priority: "P0",
          expectedIso: "2026-10-01T09:22:00.000Z",
          expectedFormatted: "1 Oct, 09:22",
        },
        {
          priority: "P1",
          expectedIso: "2026-10-01T12:22:00.000Z",
          expectedFormatted: "1 Oct, 12:22",
        },
        {
          priority: "P2",
          expectedIso: "2026-10-02T08:22:00.000Z",
          expectedFormatted: "2 Oct, 08:22",
        },
        {
          priority: "P3",
          expectedIso: "2026-10-04T08:22:00.000Z",
          expectedFormatted: "4 Oct, 08:22",
        },
      ];

      for (const { priority, expectedIso, expectedFormatted } of priorities) {
        const ticket = createTicket({
          priority,
          createdAt: baseCreated,
          status: "open",
        });

        const { unmount } = render(<DeadlineCell ticket={ticket} />);
        const timeEl = document.querySelector("time");
        expect(timeEl).toBeInTheDocument();
        expect(timeEl).toHaveAttribute("dateTime", expectedIso);
        expect(timeEl).toHaveTextContent(expectedFormatted);
        unmount();
      }
    });

    it("renders resolved and closed tickets with done dash and no active countdown", () => {
      const resolvedTicket = createTicket({
        status: "resolved",
        createdAt: "2026-10-01T08:22:00.000Z",
        priority: "P0",
      });
      const { rerender } = render(<DeadlineCell ticket={resolvedTicket} />);
      expect(screen.getByText("—")).toBeInTheDocument();
      expect(document.querySelector("time")).toBeNull();

      const closedTicket = createTicket({
        status: "closed",
        createdAt: "2026-10-01T08:22:00.000Z",
        priority: "P0",
      });
      rerender(<DeadlineCell ticket={closedTicket} />);
      expect(screen.getByText("—")).toBeInTheDocument();
      expect(document.querySelector("time")).toBeNull();
    });
  });

  describe("Bug 2: Counted scope bootstrap, test tickets in review queue, and header synchronization", () => {
    it("scope=counts in TicketStore includes all 4 test tickets: T-2003, T-2004, T-2006, T-2012", () => {
      const seed = buildSeed({ now: 1720000000000 });
      const store = new TicketStore({
        tickets: seed.tickets,
        duplicatesRemoved: seed.duplicatesRemoved,
      });

      const res = store.list({ scope: "counts" });
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      const ids = new Set(res.tickets.map((t) => t.id));
      expect(ids.has("T-2003")).toBe(true);
      expect(ids.has("T-2004")).toBe(true);
      expect(ids.has("T-2006")).toBe(true);
      expect(ids.has("T-2012")).toBe(true);

      const reviewTickets = res.tickets.filter(isPendingReview);
      const reviewIds = new Set(reviewTickets.map((t) => t.id));
      expect(reviewIds.has("T-2003")).toBe(true);
      expect(reviewIds.has("T-2004")).toBe(true);
      expect(reviewIds.has("T-2006")).toBe(true);
      expect(reviewIds.has("T-2012")).toBe(true);
    });

    it("header shows '–' before counted scope bootstrap finishes and real equal count after bootstrap", () => {
      const seed = buildSeed({ now: 1720000000000 });
      const serverStore = new TicketStore({
        tickets: seed.tickets,
        duplicatesRemoved: seed.duplicatesRemoved,
      });

      // Initial partial SSR dataset (first 200 tickets)
      const initial200 = serverStore.list({ limit: 200 });
      expect(initial200.ok).toBe(true);
      if (!initial200.ok) return;

      const store = makeStore();
      // Seed with initial partial data
      store.dispatch(ticketsSeeded({ tickets: initial200.tickets, duplicatesRemoved: 1 }));
      store.dispatch(agentHydrated("agent-1"));

      // 1. Before bootstrap finishes: header shows "To review (–)" and "My tickets (–)"
      const { unmount } = render(
        <Provider store={store}>
          <NavLinks />
          <HeaderCounts />
        </Provider>
      );

      expect(screen.getByText("To review (–)")).toBeInTheDocument();
      // HeaderCounts gates only on agent hydration, so it shows the real count immediately
      expect(screen.queryByText("My tickets (–)")).not.toBeInTheDocument();


      // 2. Perform counted scope bootstrap (loadCountedScope / countedScopeLoaded)
      const countedRes = serverStore.list({ scope: "counts" });
      expect(countedRes.ok).toBe(true);
      if (!countedRes.ok) return;

      act(() => {
        store.dispatch(countedScopeLoaded({ tickets: countedRes.tickets }));
      });

      // 3. After bootstrap: header count and review selector are equal and match
      const expectedReviewCount = selectReviewCount(store.getState());
      expect(expectedReviewCount).toBeGreaterThan(0);
      expect(screen.getByText(`To review (${expectedReviewCount})`)).toBeInTheDocument();

      const queue = selectReviewQueue(store.getState());
      expect(queue.length).toBe(expectedReviewCount);

      // Verify all four test tickets are in the queue
      const queueIds = new Set(queue.map((t) => t.id));
      expect(queueIds.has("T-2003")).toBe(true);
      expect(queueIds.has("T-2004")).toBe(true);
      expect(queueIds.has("T-2006")).toBe(true);
      expect(queueIds.has("T-2012")).toBe(true);

      unmount();
    });

    it("/review renders loading state before bootstrap and the review items after bootstrap", () => {
      const store = makeStore();
      store.dispatch(ticketsSeeded({ tickets: [], duplicatesRemoved: 0 }));

      // Before bootstrap: /review renders loading state
      const { rerender } = render(
        <Provider store={store}>
          <ReviewQueue />
        </Provider>
      );

      expect(screen.getAllByText("Loading review queue…")).toHaveLength(2);

      // Bootstrap with test tickets
      const testTickets = [
        createTicket({ id: "T-2003", triageDecision: "manual_review", humanReview: null }),
        createTicket({ id: "T-2004", triageDecision: "manual_review", humanReview: null }),
        createTicket({ id: "T-2006", triageDecision: "manual_review", humanReview: null }),
        createTicket({ id: "T-2012", triageDecision: "manual_review", humanReview: null }),
      ];

      act(() => {
        store.dispatch(countedScopeLoaded({ tickets: testTickets }));
      });

      rerender(
        <Provider store={store}>
          <ReviewQueue />
        </Provider>
      );

      expect(screen.queryByText("Loading review queue…")).toBeNull();
      expect(screen.getByText("4 tickets need review")).toBeInTheDocument();
      expect(screen.getByText("T-2003")).toBeInTheDocument();
      expect(screen.getByText("T-2004")).toBeInTheDocument();
      expect(screen.getByText("T-2006")).toBeInTheDocument();
      expect(screen.getByText("T-2012")).toBeInTheDocument();
    });
  });
});
