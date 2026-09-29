import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { TicketsWorkspace } from "@/components/tickets/TicketsWorkspace";
import { makeStore } from "@/lib/store/store";
import { ticketsSeeded } from "@/lib/store/tickets-slice";
import { EMPTY_FILTERS } from "@/lib/tickets/filters";
import type { Ticket } from "@/types/ticket";

// Mock next/navigation so TicketFilters (which uses useRouter/usePathname) renders without the App Router
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/tickets",
  useSearchParams: () => new URLSearchParams(),
}));


function makeSampleTicket(id: string, overrides: Partial<Ticket> = {}): Ticket {
  return {
    id,
    customerId: "cust-1",
    plan: "pro",
    subject: `Ticket ${id}`,
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
    triageDecision: "auto_accept",
    reviewReason: null,
    dataIssues: [],
    ...overrides,
  };
}

describe("TicketsWorkspace Bulk Actions UI", () => {
  it("bulk action bar appears after selecting rows and disappears on clear", async () => {
    const t1 = makeSampleTicket("T-1");
    const t2 = makeSampleTicket("T-2");

    const store = makeStore();
    store.dispatch(ticketsSeeded({ tickets: [t1, t2] }));

    render(
      <Provider store={store}>
        <TicketsWorkspace filters={EMPTY_FILTERS} />
      </Provider>
    );

    // Initially no bulk action bar
    expect(screen.queryByText("1 selected")).not.toBeInTheDocument();

    // Select T-1 checkbox
    const checkbox1 = screen.getAllByLabelText("Select T-1")[0];
    await userEvent.click(checkbox1);

    // Bulk action bar is now visible
    expect(screen.getAllByText("1 selected").length).toBeGreaterThan(0);

    // Clear selection
    const clearBtn = screen.getAllByRole("button", { name: /clear/i })[0];
    await userEvent.click(clearBtn);

    // Bulk action bar is hidden
    expect(screen.queryByText("1 selected")).not.toBeInTheDocument();
  });

  it("select all visible selects all items and updates bar count", async () => {
    const t1 = makeSampleTicket("T-1");
    const t2 = makeSampleTicket("T-2");

    const store = makeStore();
    store.dispatch(ticketsSeeded({ tickets: [t1, t2] }));

    render(
      <Provider store={store}>
        <TicketsWorkspace filters={EMPTY_FILTERS} />
      </Provider>
    );

    const selectAllCheckbox = screen.getByLabelText("Select all visible tickets");
    await userEvent.click(selectAllCheckbox);

    expect(screen.getAllByText("2 selected").length).toBeGreaterThan(0);
  });
});
