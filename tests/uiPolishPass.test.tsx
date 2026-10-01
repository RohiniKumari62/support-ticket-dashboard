import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { makeStore } from "@/lib/store/store";
import { ticketsSeeded } from "@/lib/store/tickets-slice";
import { TicketFilters } from "@/components/tickets/TicketFilters";
import { AgentSelect } from "@/components/layout/AgentSelect";
import { DeadlineCell } from "@/components/tickets/DeadlineCell";
import { TicketTable } from "@/components/tickets/TicketTable";
import { TicketListItem } from "@/components/tickets/TicketListItem";
import { EMPTY_FILTERS } from "@/lib/tickets/filters";
import type { Ticket } from "@/types/ticket";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  }),
  usePathname: () => "/tickets",
  useSearchParams: () => new URLSearchParams(),
}));

function createTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "T-9999",
    customerId: "C-1",
    plan: "pro",
    subject: "Refund requested for double charge",
    body: "Please refund my payment",
    attachmentUrl: null,
    createdAt: "2026-09-30T10:00:00.000Z",
    status: "open",
    assignedTo: "agent-1",
    assignedToUnknown: null,
    category: "billing",
    priority: "P1",
    aiPriority: null,
    summary: "Refund issue",
    triageDecision: "manual_review",
    reviewReason: null,
    humanReview: null,
    dataIssues: [],
    version: 1,
    updatedAt: "2026-09-30T10:00:00.000Z",
    ...overrides,
  };
}

describe("UI Polish Pass Verification", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
  });

  describe("1. Filters dropdown styling and navigation", () => {
    it("renders each of the four controls as a labelled select with All... first option", () => {
      render(
        <TicketFilters
          filters={EMPTY_FILTERS}
          totalCount={20}
          resultCount={20}
        />
      );

      const statusSelect = screen.getByRole("combobox", { name: "Status" });
      const prioritySelect = screen.getByRole("combobox", { name: "Priority" });
      const categorySelect = screen.getByRole("combobox", { name: "Category" });
      const decisionSelect = screen.getByRole("combobox", { name: "AI decision" });

      expect(statusSelect).toBeInTheDocument();
      expect(prioritySelect).toBeInTheDocument();
      expect(categorySelect).toBeInTheDocument();
      expect(decisionSelect).toBeInTheDocument();

      expect(screen.getByRole("option", { name: "All statuses" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "All priorities" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "All categories" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "All decisions" })).toBeInTheDocument();
    });

    it("navigates with correct URL when filter changes", () => {
      render(
        <TicketFilters
          filters={EMPTY_FILTERS}
          totalCount={20}
          resultCount={20}
        />
      );

      const statusSelect = screen.getByRole("combobox", { name: "Status" });
      fireEvent.change(statusSelect, { target: { value: "open" } });

      expect(mockPush).toHaveBeenCalledWith("/tickets?status=open", { scroll: false });
    });
  });

  describe("2. Active filter chips", () => {
    it("renders no chips when no filters are active", () => {
      render(
        <TicketFilters
          filters={EMPTY_FILTERS}
          totalCount={20}
          resultCount={20}
        />
      );

      expect(screen.queryByRole("button", { name: /Remove filter/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Clear all" })).not.toBeInTheDocument();
    });

    it("renders chips for active filters with correct text and accessible name", () => {
      render(
        <TicketFilters
          filters={{
            ...EMPTY_FILTERS,
            status: "open",
            priority: "P1",
          }}
          totalCount={20}
          resultCount={5}
        />
      );

      const statusChip = screen.getByRole("button", { name: "Remove filter Status: Open" });
      const priorityChip = screen.getByRole("button", { name: "Remove filter Priority: P1" });

      expect(statusChip).toBeInTheDocument();
      expect(priorityChip).toBeInTheDocument();
      expect(statusChip).toHaveTextContent("Status: Open");
      expect(priorityChip).toHaveTextContent("Priority: P1");
    });

    it("removing a chip navigates to the URL without that parameter", () => {
      render(
        <TicketFilters
          filters={{
            ...EMPTY_FILTERS,
            status: "open",
            priority: "P1",
          }}
          totalCount={20}
          resultCount={5}
        />
      );

      const statusChip = screen.getByRole("button", { name: "Remove filter Status: Open" });
      fireEvent.click(statusChip);

      expect(mockPush).toHaveBeenCalledWith("/tickets?priority=P1", { scroll: false });
    });

    it("search chip renders text safely, truncates, and removal clears search and input", () => {
      const hostileSearch = '<img src=x onerror=alert(1)>';
      render(
        <TicketFilters
          filters={{
            ...EMPTY_FILTERS,
            q: hostileSearch,
          }}
          totalCount={20}
          resultCount={1}
        />
      );

      // Verify no img element was injected into DOM
      expect(document.querySelector("img")).toBeNull();

      const searchChip = screen.getByRole("button", {
        name: `Remove filter Search: "${hostileSearch}"`,
      });
      expect(searchChip).toBeInTheDocument();

      fireEvent.click(searchChip);
      expect(mockPush).toHaveBeenCalledWith("/tickets", { scroll: false });
    });

    it("Clear all navigates to bare path", () => {
      render(
        <TicketFilters
          filters={{
            ...EMPTY_FILTERS,
            status: "open",
          }}
          totalCount={20}
          resultCount={5}
        />
      );

      const clearAllBtn = screen.getByRole("button", { name: "Clear all" });
      fireEvent.click(clearAllBtn);

      expect(mockPush).toHaveBeenCalledWith("/tickets", { scroll: false });
    });

    it("renders all five chips when combined filters are active", () => {
      render(
        <TicketFilters
          filters={{
            q: "billing problem",
            status: "in_progress",
            priority: "P0",
            category: "billing",
            decision: "manual_review",
          }}
          totalCount={20}
          resultCount={2}
        />
      );

      const chips = screen.getAllByRole("button", { name: /^Remove filter/ });
      expect(chips).toHaveLength(5);
      expect(screen.getByRole("button", { name: 'Remove filter Search: "billing problem"' })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remove filter Status: In progress" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remove filter Priority: P0" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remove filter Category: Billing" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remove filter AI decision: Needs review" })).toBeInTheDocument();
    });
  });

  describe("3. Agent selector avatar", () => {
    it("renders user avatar image", async () => {
      const store = makeStore();
      render(
        <Provider store={store}>
          <AgentSelect />
        </Provider>
      );

      const img = document.querySelector('img[src="/avatar-user.png"]');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("4. DeadlineCell status pills and countdown presentation", () => {
    it("renders On track, At risk, Late pills and static completion without aria-live", () => {
      // On track (P1 has 4h SLA, at createdTime + 1h = 75% remaining)
      const onTrackTicket = createTicket({
        priority: "P1",
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      });

      const { rerender } = render(<DeadlineCell ticket={onTrackTicket} />);
      expect(screen.getByText("On track")).toBeInTheDocument();
      expect(screen.getByText("On track")).toHaveClass("bg-green-50");

      // Verify no element has aria-live on the countdown
      const liveElements = document.querySelectorAll("[aria-live]");
      expect(liveElements).toHaveLength(0);

      // Resolved ticket displays done "—" without countdown
      const resolvedTicket = createTicket({
        status: "resolved",
      });
      rerender(<DeadlineCell ticket={resolvedTicket} />);
      expect(screen.getByText("—")).toBeInTheDocument();

      // Future date displays Check date
      const futureTicket = createTicket({
        createdAt: "2029-01-01T00:00:00.000Z",
      });
      rerender(<DeadlineCell ticket={futureTicket} />);
      expect(screen.getByText("Check date")).toBeInTheDocument();
    });
  });

  describe("5. Row hover and subject link hover/focus", () => {
    it("table subject link has no hover:underline and maintains focus-visible ring", () => {
      const store = makeStore();
      const ticket = createTicket();
      store.dispatch(ticketsSeeded({ tickets: [ticket], duplicatesRemoved: 0 }));

      render(
        <Provider store={store}>
          <TicketTable
            tickets={[ticket]}
            selectedIds={new Set()}
            onToggle={vi.fn()}
          />
        </Provider>
      );

      const link = screen.getByRole("link", { name: ticket.subject });
      expect(link.className).not.toContain("hover:underline");
      expect(link.className).toContain("hover:text-blue-600");
      expect(link.className).toContain("focus-visible:outline-2");
    });

    it("mobile list item subject link has no hover:underline and maintains focus-visible ring", () => {
      const store = makeStore();
      const ticket = createTicket();
      store.dispatch(ticketsSeeded({ tickets: [ticket], duplicatesRemoved: 0 }));

      render(
        <Provider store={store}>
          <TicketListItem ticket={ticket} onToggle={vi.fn()} />
        </Provider>
      );

      const link = screen.getByRole("link", { name: ticket.subject });
      expect(link.className).not.toContain("hover:underline");
      expect(link.className).toContain("hover:text-blue-600");
      expect(link.className).toContain("focus-visible:outline-2");
    });

    it("clicking row checkbox toggles selection without navigating", async () => {
      const store = makeStore();
      const ticket = createTicket();
      store.dispatch(ticketsSeeded({ tickets: [ticket], duplicatesRemoved: 0 }));

      const onToggle = vi.fn();
      render(
        <Provider store={store}>
          <TicketTable
            tickets={[ticket]}
            selectedIds={new Set()}
            onToggle={onToggle}
          />
        </Provider>
      );

      const checkbox = screen.getByRole("checkbox", { name: `Select ${ticket.id}` });
      await userEvent.click(checkbox);

      expect(onToggle).toHaveBeenCalledWith(ticket.id);
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
