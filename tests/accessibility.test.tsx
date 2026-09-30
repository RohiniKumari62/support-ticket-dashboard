import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { makeStore } from "@/lib/store/store";
import { ticketsSeeded } from "@/lib/store/tickets-slice";
import { TicketFilters } from "@/components/tickets/TicketFilters";
import { TicketTable } from "@/components/tickets/TicketTable";
import { TicketActions } from "@/components/tickets/detail/TicketActions";
import type { Ticket } from "@/types/ticket";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/tickets",
  useSearchParams: () => new URLSearchParams(),
}));

function makeTestTicket(id: string): Ticket {
  return {
    id,
    customerId: "C-100",
    plan: "enterprise",
    subject: "Test Ticket Accessible Name",
    body: "Body",
    attachmentUrl: null,
    createdAt: "2026-09-30T10:00:00.000Z",
    status: "open",
    assignedTo: null,
    assignedToUnknown: null,
    category: "billing",
    priority: "P1",
    aiPriority: null,
    summary: "Summary",
    triageDecision: "auto_accept",
    reviewReason: null,
    humanReview: null,
    dataIssues: [],
    version: 1,
    updatedAt: "2026-09-30T10:00:00.000Z",
  };
}

describe("Accessibility Verification (Phase 11)", () => {
  it("verifies form inputs and selects have associated accessible labels", () => {
    render(
      <TicketFilters
        filters={{ q: "", status: null, priority: null, category: null, decision: null }}
        totalCount={10}
        resultCount={10}
      />
    );

    // Search input accessible name
    expect(screen.getByRole("searchbox", { name: "Search subject and body" })).toBeInTheDocument();

    // Four native filter selects have associated labels
    expect(screen.getByRole("combobox", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Priority" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Category" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "AI decision" })).toBeInTheDocument();
  });

  it("verifies table and row checkboxes have accessible names", () => {
    const store = makeStore();
    const ticket = makeTestTicket("T-2001");
    store.dispatch(ticketsSeeded({ tickets: [ticket], duplicatesRemoved: 0 }));

    render(
      <Provider store={store}>
        <TicketTable
          tickets={[ticket]}
          selectedIds={new Set()}
          onToggle={vi.fn()}
          onSelectAll={vi.fn()}
          isAllSelected={false}
          isIndeterminate={false}
        />
      </Provider>
    );

    // Header checkbox accessible name
    expect(
      screen.getByRole("checkbox", { name: "Select all visible tickets" })
    ).toBeInTheDocument();

    // Row checkbox accessible name
    expect(
      screen.getByRole("checkbox", { name: "Select T-2001" })
    ).toBeInTheDocument();

    // Table caption
    expect(screen.getByText("Customer support tickets list")).toBeInTheDocument();
  });

  it("verifies feedback regions announce with role alert for errors and status for notices", () => {
    const ticket = makeTestTicket("T-2001");

    // Render with error feedback
    const { rerender } = render(
      <TicketActions
        ticket={ticket}
        currentAgentId="agent-1"
        pendingAction={null}
        feedback={{ kind: "error", text: "Action failed: 409 conflict" }}
        onClaim={vi.fn()}
        onStatusChange={vi.fn()}
        onRetriage={vi.fn()}
      />
    );

    const alertRegion = screen.getByRole("alert");
    expect(alertRegion).toHaveTextContent("Action failed: 409 conflict");

    // Rerender with success feedback
    rerender(
      <TicketActions
        ticket={ticket}
        currentAgentId="agent-1"
        pendingAction={null}
        feedback={{ kind: "success", text: "Ticket assigned to you" }}
        onClaim={vi.fn()}
        onStatusChange={vi.fn()}
        onRetriage={vi.fn()}
      />
    );

    const statusRegion = screen.getByRole("status");
    expect(statusRegion).toHaveTextContent("Ticket assigned to you");
  });
});
