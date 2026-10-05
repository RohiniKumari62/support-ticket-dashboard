import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { makeStore } from "@/lib/store/store";
import {
  countedScopeLoaded,
  ticketsSeeded,
  ticketReceivedFromServer,
} from "@/lib/store/tickets-slice";
import { agentHydrated } from "@/lib/store/agent-slice";
import { DeadlineCell } from "@/components/tickets/DeadlineCell";
import { NavLinks } from "@/components/layout/NavLinks";
import { HeaderCounts } from "@/components/layout/HeaderCounts";
import { ReviewQueue } from "@/components/review/ReviewQueue";
import { buildSeed } from "@/lib/server/seed";
import { TicketStore } from "@/lib/server/ticket-store";
import { selectReviewCount, selectReviewQueue } from "@/lib/store/tickets-selectors";
import { isPendingReview } from "@/lib/tickets/counts";
import { filterTickets, hasActiveFilters } from "@/lib/tickets/filters";
import { TicketList } from "@/components/tickets/TicketList";
import { TicketDetail } from "@/components/tickets/detail/TicketDetail";
import { reviewTicketThunk } from "@/lib/store/tickets-thunks";
import type { TicketsApiClient } from "@/lib/api/tickets-client";
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

  describe("Bug 3: AI review save flow, state consistency, and ticket ID search", () => {
    it("searches for an existing ticket by its exact or partial ID case-insensitively", () => {
      const tickets = [
        createTicket({
          id: "T-14426",
          subject: "Connectivity timeout in production",
          body: "Intermittent database timeouts.",
        }),
        createTicket({
          id: "T-1002",
          subject: "Billing card issue",
          body: "Visa payment failed.",
        }),
      ];

      // Exact ID
      const exact = filterTickets(tickets, {
        q: "T-14426",
        status: null,
        priority: null,
        category: null,
        decision: null,
      });
      expect(exact).toHaveLength(1);
      expect(exact[0].id).toBe("T-14426");

      // Lowercase ID
      const lower = filterTickets(tickets, {
        q: "t-14426",
        status: null,
        priority: null,
        category: null,
        decision: null,
      });
      expect(lower).toHaveLength(1);
      expect(lower[0].id).toBe("T-14426");

      // Partial numeric ID
      const partial = filterTickets(tickets, {
        q: "14426",
        status: null,
        priority: null,
        category: null,
        decision: null,
      });
      expect(partial).toHaveLength(1);
      expect(partial[0].id).toBe("T-14426");

      // Nonexistent ID returns empty
      const none = filterTickets(tickets, {
        q: "T-99999",
        status: null,
        priority: null,
        category: null,
        decision: null,
      });
      expect(none).toHaveLength(0);
    });

    it("searching by subject or body continues to work alongside ID search", () => {
      const tickets = [
        createTicket({
          id: "T-14426",
          subject: "Connectivity timeout in production",
          body: "Intermittent database timeouts.",
        }),
        createTicket({
          id: "T-1002",
          subject: "Billing card issue",
          body: "Visa payment failed.",
        }),
      ];

      // Search subject
      const subjectMatch = filterTickets(tickets, {
        q: "timeout",
        status: null,
        priority: null,
        category: null,
        decision: null,
      });
      expect(subjectMatch).toHaveLength(1);
      expect(subjectMatch[0].id).toBe("T-14426");

      // Search body
      const bodyMatch = filterTickets(tickets, {
        q: "visa payment",
        status: null,
        priority: null,
        category: null,
        decision: null,
      });
      expect(bodyMatch).toHaveLength(1);
      expect(bodyMatch[0].id).toBe("T-1002");
    });

    it("changing reviewed ticket priority from P1 to P0 saves authoritative data, removes from queue, and reflects in main dashboard and ticket detail", async () => {
      const initialTicket = createTicket({
        id: "T-14426",
        priority: "P1",
        category: "bug",
        subject: "Connectivity timeout in production",
        triageDecision: "manual_review",
        humanReview: null,
      });

      const updatedServerTicket: Ticket = {
        ...initialTicket,
        priority: "P0",
        category: "bug",
        aiPriority: "P1",
        version: initialTicket.version + 1,
        humanReview: {
          action: "changed",
          reviewedBy: "agent-1",
          note: "Outage escalating to P0",
        },
      };

      const mockApi: TicketsApiClient = {
        claimTicket: vi.fn(),
        changeTicketStatus: vi.fn(),
        retriageTicket: vi.fn(),
        submitReview: vi.fn().mockResolvedValue({
          ok: true,
          ticket: updatedServerTicket,
        }),
      };

      const store = makeStore(undefined, { api: mockApi });
      store.dispatch(ticketsSeeded({ tickets: [initialTicket] }));
      store.dispatch(agentHydrated("agent-1"));

      // 1. Initially ticket is in review queue
      const initialQueue = selectReviewQueue(store.getState());
      expect(initialQueue.map((t) => t.id)).toContain("T-14426");

      // 2. Dispatch review change from P1 to P0
      const action = await store.dispatch(
        reviewTicketThunk({
          ticketId: "T-14426",
          decision: {
            type: "change",
            category: "bug",
            priority: "P0",
            reason: "Outage escalating to P0",
          },
          reviewerId: "agent-1",
        })
      );

      expect(reviewTicketThunk.fulfilled.match(action)).toBe(true);

      // 3. Ticket leaves review queue after successful save
      const afterQueue = selectReviewQueue(store.getState());
      expect(afterQueue.map((t) => t.id)).not.toContain("T-14426");

      // 4. Ticket in Redux authoritative store now has priority P0
      const storedTicket = store.getState().tickets.byId["T-14426"];
      expect(storedTicket.priority).toBe("P0");
      expect(storedTicket.humanReview?.action).toBe("changed");

      // 5. Searching by T-14426 on main ticket list finds the ticket with priority P0
      const searchResults = filterTickets(
        [store.getState().tickets.byId["T-14426"]],
        {
          q: "T-14426",
          status: null,
          priority: null,
          category: null,
          decision: null,
        }
      );
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].priority).toBe("P0");

      // 6. TicketList renders row with P0 badge and ticket ID
      const { unmount: unmountList } = render(
        <Provider store={store}>
          <TicketList
            tickets={[storedTicket]}
            duplicatesRemoved={0}
            hasActiveFilters={true}
          />
        </Provider>
      );
      expect(screen.getAllByText("P0").length).toBeGreaterThanOrEqual(1);
      expect(document.querySelector('a[href="/tickets/T-14426"]')).toBeInTheDocument();
      unmountList();

      // 7. TicketDetail renders with P0 badge and ticket ID
      const { unmount: unmountDetail } = render(
        <Provider store={store}>
          <TicketDetail ticketId="T-14426" ticket={storedTicket} />
        </Provider>
      );
      expect(screen.getAllByText("P0").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("T-14426")).toBeInTheDocument();
      unmountDetail();
    });

    it("failed review save preserves error state, keeps ticket in queue, and does not report success", async () => {
      const initialTicket = createTicket({
        id: "T-14426",
        priority: "P1",
        category: "bug",
        subject: "Connectivity timeout in production",
        triageDecision: "manual_review",
        humanReview: null,
      });

      const mockApi: TicketsApiClient = {
        claimTicket: vi.fn(),
        changeTicketStatus: vi.fn(),
        retriageTicket: vi.fn(),
        submitReview: vi.fn().mockResolvedValue({
          ok: false,
          code: "network",
          message: "Database connection failed",
        }),
      };

      const store = makeStore(undefined, { api: mockApi });
      store.dispatch(ticketsSeeded({ tickets: [initialTicket] }));
      store.dispatch(agentHydrated("agent-1"));

      // Dispatch change that fails
      const action = await store.dispatch(
        reviewTicketThunk({
          ticketId: "T-14426",
          decision: {
            type: "change",
            category: "bug",
            priority: "P0",
            reason: "Outage escalating to P0",
          },
          reviewerId: "agent-1",
        })
      );

      expect(reviewTicketThunk.rejected.match(action)).toBe(true);

      // Ticket is STILL in the review queue
      const queue = selectReviewQueue(store.getState());
      expect(queue.map((t) => t.id)).toContain("T-14426");

      // Ticket priority was NOT saved as P0
      const storedTicket = store.getState().tickets.byId["T-14426"];
      expect(storedTicket.priority).toBe("P1");
      expect(storedTicket.humanReview).toBeNull();
    });

    it("changing ticket category saves new category and works across multiple different ticket IDs", async () => {
      const tickets = [
        createTicket({
          id: "T-1002",
          category: "billing",
          priority: "P2",
          subject: "Billing issue",
          triageDecision: "manual_review",
          humanReview: null,
        }),
        createTicket({
          id: "T-1003",
          category: "account_access",
          priority: "P2",
          subject: "Password reset issue",
          triageDecision: "manual_review",
          humanReview: null,
        }),
      ];

      const mockApi: TicketsApiClient = {
        claimTicket: vi.fn(),
        changeTicketStatus: vi.fn(),
        retriageTicket: vi.fn(),
        submitReview: vi.fn().mockImplementation(async (ticket, decision, reviewerId) => {
          return {
            ok: true,
            ticket: {
              ...ticket,
              category: decision.category,
              priority: decision.priority,
              version: ticket.version + 1,
              humanReview: {
                action: "changed",
                reviewedBy: reviewerId,
                note: decision.reason,
              },
            },
          };
        }),
      };

      const store = makeStore(undefined, { api: mockApi });
      store.dispatch(ticketsSeeded({ tickets }));
      store.dispatch(agentHydrated("agent-2"));

      // Update T-1002 category to feature_request
      await store.dispatch(
        reviewTicketThunk({
          ticketId: "T-1002",
          decision: {
            type: "change",
            category: "feature_request",
            priority: "P2",
            reason: "User is actually requesting a new billing invoice feature",
          },
          reviewerId: "agent-2",
        })
      );

      // Update T-1003 category to bug and priority to P1
      await store.dispatch(
        reviewTicketThunk({
          ticketId: "T-1003",
          decision: {
            type: "change",
            category: "bug",
            priority: "P1",
            reason: "Underlying authentication service bug confirmed",
          },
          reviewerId: "agent-2",
        })
      );

      // Both tickets leave the review queue
      const queue = selectReviewQueue(store.getState());
      expect(queue.map((t) => t.id)).not.toContain("T-1002");
      expect(queue.map((t) => t.id)).not.toContain("T-1003");

      // Authoritative store holds the updated categories and priorities
      const t1002 = store.getState().tickets.byId["T-1002"];
      expect(t1002.category).toBe("feature_request");

      const t1003 = store.getState().tickets.byId["T-1003"];
      expect(t1003.category).toBe("bug");
      expect(t1003.priority).toBe("P1");

      // Both can be found by their ticket IDs in the main ticket dataset
      const found1002 = filterTickets(Object.values(store.getState().tickets.byId), {
        q: "T-1002",
        status: null,
        priority: null,
        category: null,
        decision: null,
      });
      expect(found1002).toHaveLength(1);
      expect(found1002[0].category).toBe("feature_request");

      const found1003 = filterTickets(Object.values(store.getState().tickets.byId), {
        q: "T-1003",
        status: null,
        priority: null,
        category: null,
        decision: null,
      });
      expect(found1003).toHaveLength(1);
      expect(found1003[0].category).toBe("bug");
      expect(found1003[0].priority).toBe("P1");
    });

    it("existing active filters behave correctly and clearing filters restores visibility", () => {
      const tickets = [
        createTicket({ id: "T-14426", status: "open", priority: "P0", category: "bug" }),
        createTicket({ id: "T-1002", status: "resolved", priority: "P2", category: "billing" }),
      ];

      // Filter by status=open
      const openFilters = { q: "", status: "open" as const, priority: null, category: null, decision: null };
      expect(hasActiveFilters(openFilters)).toBe(true);
      const openResults = filterTickets(tickets, openFilters);
      expect(openResults.map((t) => t.id)).toEqual(["T-14426"]);

      // Filter by category=billing
      const billingFilters = { q: "", status: null, priority: null, category: "billing" as const, decision: null };
      expect(filterTickets(tickets, billingFilters).map((t) => t.id)).toEqual(["T-1002"]);

      // Clearing filters (empty filters) returns all tickets
      const clearedFilters = { q: "", status: null, priority: null, category: null, decision: null };
      expect(hasActiveFilters(clearedFilters)).toBe(false);
      expect(filterTickets(tickets, clearedFilters)).toHaveLength(2);
    });

    it("an older polling response or stale version does not overwrite newer saved review values", () => {
      const store = makeStore();
      const initialTicket = createTicket({
        id: "T-14426",
        priority: "P1",
        category: "bug",
        version: 1,
      });
      store.dispatch(ticketsSeeded({ tickets: [initialTicket] }));

      // Simulate saved review with version 2
      const updatedTicket: Ticket = {
        ...initialTicket,
        priority: "P0",
        version: 2,
        humanReview: { action: "changed", reviewedBy: "agent-1", note: "Outage escalation" },
      };
      store.dispatch(ticketReceivedFromServer(updatedTicket));

      expect(store.getState().tickets.byId["T-14426"].priority).toBe("P0");
      expect(store.getState().tickets.byId["T-14426"].version).toBe(2);

      // Now simulate a stale poll response arriving with version 1 (older)
      const stalePollTicket: Ticket = {
        ...initialTicket,
        priority: "P1",
        version: 1,
      };
      store.dispatch(ticketReceivedFromServer(stalePollTicket));

      // The newer P0 priority MUST be preserved and not overwritten
      expect(store.getState().tickets.byId["T-14426"].priority).toBe("P0");
      expect(store.getState().tickets.byId["T-14426"].version).toBe(2);
    });
  });
});
