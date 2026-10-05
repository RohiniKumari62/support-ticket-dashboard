import { describe, it, expect, vi } from "vitest";
import React, { act } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { TicketsWorkspace } from "@/components/tickets/TicketsWorkspace";
import { makeStore } from "@/lib/store/store";
import { ticketsSeeded, ticketReceivedFromServer } from "@/lib/store/tickets-slice";
import { EMPTY_FILTERS } from "@/lib/tickets/filters";
import type { Ticket } from "@/types/ticket";
import type { TicketsApiClient } from "@/lib/api/tickets-client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/tickets",
  useSearchParams: () => new URLSearchParams(),
}));

function makeTestTicket(id: string, overrides: Partial<Ticket> = {}): Ticket {
  return {
    id,
    customerId: `cust-${id}`,
    plan: "enterprise",
    subject: `Subject ${id}`,
    body: `Body ${id}`,
    attachmentUrl: null,
    createdAt: "2026-10-05T10:00:00.000Z",
    status: "open",
    assignedTo: null,
    assignedToUnknown: null,
    category: "account_access",
    priority: "P0",
    aiPriority: null,
    summary: `Summary ${id}`,
    triageDecision: "auto_accept",
    reviewReason: null,
    humanReview: null,
    dataIssues: [],
    version: 1,
    updatedAt: "2026-10-05T10:00:00.000Z",
    ...overrides,
  };
}

describe("Bulk Selection Identity and Reordering Safety", () => {
  it("Requirement 1 & 2: selects two specific ticket IDs and bulk claim sends exactly those two IDs to the API", async () => {
    const claimedIds: string[] = [];
    const mockApi: TicketsApiClient = {
      claimTicket: vi.fn().mockImplementation(async (id: string, agentId: string) => {
        claimedIds.push(id);
        return {
          ok: true,
          ticket: makeTestTicket(id, { assignedTo: agentId, version: 2 }),
        };
      }),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: vi.fn(),
    };

    const t1 = makeTestTicket("T-1001", { subject: "SCIM user provisioning sync error" });
    const t2 = makeTestTicket("T-1002", { subject: "Request for security compliance documentation (SOC2)" });
    const t3 = makeTestTicket("T-1003", { subject: "Documentation clarification regarding data retention" });

    const store = makeStore(undefined, { api: mockApi });
    store.dispatch(ticketsSeeded({ tickets: [t1, t2, t3] }));

    render(
      <Provider store={store}>
        <TicketsWorkspace filters={EMPTY_FILTERS} />
      </Provider>
    );

    // Select T-1001 and T-1002
    const cb1 = screen.getAllByLabelText("Select T-1001")[0];
    const cb2 = screen.getAllByLabelText("Select T-1002")[0];
    fireEvent.click(cb1);
    fireEvent.click(cb2);

    // Click Claim in BulkActionBar
    const claimBtn = screen.getAllByRole("button", { name: /^claim$/i })[0];
    await act(async () => {
      fireEvent.click(claimBtn);
    });

    // Exactly T-1001 and T-1002 must have been sent
    expect(claimedIds).toHaveLength(2);
    expect(claimedIds).toContain("T-1001");
    expect(claimedIds).toContain("T-1002");
    expect(claimedIds).not.toContain("T-1003");
  });

  it("Requirement 3, 4 & 10: simulating a live update / reordering between selection and bulk action preserves identity", async () => {
    const claimedIds: string[] = [];
    const mockApi: TicketsApiClient = {
      claimTicket: vi.fn().mockImplementation(async (id: string, agentId: string) => {
        claimedIds.push(id);
        return {
          ok: true,
          ticket: makeTestTicket(id, { assignedTo: agentId, version: 2 }),
        };
      }),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: vi.fn(),
    };

    const t1 = makeTestTicket("T-1001", { createdAt: "2026-10-05T10:00:00.000Z" });
    const t2 = makeTestTicket("T-1002", { createdAt: "2026-10-05T09:00:00.000Z" });

    const store = makeStore(undefined, { api: mockApi });
    store.dispatch(ticketsSeeded({ tickets: [t1, t2] }));

    render(
      <Provider store={store}>
        <TicketsWorkspace filters={EMPTY_FILTERS} />
      </Provider>
    );

    // User selects index 1 (T-1002)
    const cbT1002 = screen.getAllByLabelText("Select T-1002")[0];
    fireEvent.click(cbT1002);
    expect(cbT1002).toBeChecked();

    // Now a live update inserts a newer ticket at the top of the list (shifting T-1001 to index 1, T-1002 to index 2)
    const tNew = makeTestTicket("T-9999", { createdAt: "2026-10-05T11:00:00.000Z" });
    act(() => {
      store.dispatch(ticketReceivedFromServer(tNew));
    });

    // T-1002 must STILL be selected, and T-1001 must NOT be selected
    expect(screen.getAllByLabelText("Select T-1002")[0]).toBeChecked();
    expect(screen.getAllByLabelText("Select T-1001")[0]).not.toBeChecked();
    expect(screen.getAllByLabelText("Select T-9999")[0]).not.toBeChecked();

    // User clicks Claim
    const claimBtn = screen.getAllByRole("button", { name: /^claim$/i })[0];
    await act(async () => {
      fireEvent.click(claimBtn);
    });

    // API must receive ONLY T-1002, never T-1001 or T-9999
    expect(claimedIds).toEqual(["T-1002"]);
  });

  it("Requirement 5, 6 & 7: selected ticket becoming closed on server produces closed failure for THAT SAME ID while others succeed", async () => {
    const mockApi: TicketsApiClient = {
      claimTicket: vi.fn().mockImplementation(async (id: string, agentId: string) => {
        if (id === "T-1001") {
          // Server reports T-1001 is closed
          return {
            ok: false,
            code: "invalid_transition",
            message: "Cannot claim a closed ticket.",
            ticket: makeTestTicket("T-1001", { status: "closed", version: 2 }),
          };
        }
        return {
          ok: true,
          ticket: makeTestTicket(id, { assignedTo: agentId, version: 2 }),
        };
      }),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: vi.fn(),
    };

    const t1 = makeTestTicket("T-1001", { subject: "SCIM provisioning error" });
    const t2 = makeTestTicket("T-1002", { subject: "SOC2 compliance request" });

    const store = makeStore(undefined, { api: mockApi });
    store.dispatch(ticketsSeeded({ tickets: [t1, t2] }));

    render(
      <Provider store={store}>
        <TicketsWorkspace filters={EMPTY_FILTERS} />
      </Provider>
    );

    fireEvent.click(screen.getAllByLabelText("Select T-1001")[0]);
    fireEvent.click(screen.getAllByLabelText("Select T-1002")[0]);

    const claimBtn = screen.getAllByRole("button", { name: /^claim$/i })[0];
    await act(async () => {
      fireEvent.click(claimBtn);
    });

    // Result panel checks
    expect(screen.getByText(/1 done, 1 failed, 0 skipped/i)).toBeInTheDocument();

    // T-1001 specifically shows failure message
    const resultItems = screen.getAllByRole("listitem");
    const t1Item = resultItems.find((li) => within(li).queryByText("T-1001"));
    const t2Item = resultItems.find((li) => within(li).queryByText("T-1002"));

    expect(t1Item).toBeDefined();
    expect(within(t1Item!).getByText(/Cannot claim a closed ticket/i)).toBeInTheDocument();

    expect(t2Item).toBeDefined();
    expect(within(t2Item!).getByText("Claimed")).toBeInTheDocument();
  });

  it("Requirement 8: Retry failed retries exactly the failed ticket IDs and not whatever is at the array position", async () => {
    let t1CallCount = 0;
    const mockApi: TicketsApiClient = {
      claimTicket: vi.fn().mockImplementation(async (id: string, agentId: string) => {
        if (id === "T-1001") {
          t1CallCount++;
          if (t1CallCount === 1) {
            return {
              ok: false,
              code: "network",
              message: "Network glitch",
            };
          }
          return {
            ok: true,
            ticket: makeTestTicket("T-1001", { assignedTo: agentId, version: 2 }),
          };
        }
        return {
          ok: true,
          ticket: makeTestTicket(id, { assignedTo: agentId, version: 2 }),
        };
      }),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: vi.fn(),
    };

    const t1 = makeTestTicket("T-1001", { subject: "Ticket 1" });
    const t2 = makeTestTicket("T-1002", { subject: "Ticket 2" });

    const store = makeStore(undefined, { api: mockApi });
    store.dispatch(ticketsSeeded({ tickets: [t1, t2] }));

    render(
      <Provider store={store}>
        <TicketsWorkspace filters={EMPTY_FILTERS} />
      </Provider>
    );

    fireEvent.click(screen.getAllByLabelText("Select T-1001")[0]);
    fireEvent.click(screen.getAllByLabelText("Select T-1002")[0]);

    const claimBtn = screen.getAllByRole("button", { name: /^claim$/i })[0];
    await act(async () => {
      fireEvent.click(claimBtn);
    });

    // T-1001 failed, T-1002 succeeded
    expect(screen.getByText(/1 done, 1 failed, 0 skipped/i)).toBeInTheDocument();

    // Now insert a new ticket to shift row positions
    act(() => {
      store.dispatch(
        ticketReceivedFromServer(
          makeTestTicket("T-9999", { createdAt: "2026-10-05T12:00:00.000Z" })
        )
      );
    });

    // Click "Retry failed (1)"
    const retryBtn = screen.getByRole("button", { name: /retry failed/i });
    await act(async () => {
      fireEvent.click(retryBtn);
    });

    // T-1001 was retried specifically
    expect(t1CallCount).toBe(2);
    expect(mockApi.claimTicket).toHaveBeenCalledWith("T-1001", "agent-1", expect.anything());
    // T-9999 and T-1002 were NOT retried
    expect(mockApi.claimTicket).not.toHaveBeenCalledWith("T-9999", expect.anything(), expect.anything());

    // Both are now done
    expect(screen.getByText(/2 done, 0 failed, 0 skipped/i)).toBeInTheDocument();
  });

  it("Requirement 9: select-all visible uses ticket IDs and handles list modifications without index confusion", async () => {
    const claimedIds: string[] = [];
    const mockApi: TicketsApiClient = {
      claimTicket: vi.fn().mockImplementation(async (id: string, agentId: string) => {
        claimedIds.push(id);
        return {
          ok: true,
          ticket: makeTestTicket(id, { assignedTo: agentId }),
        };
      }),
      changeTicketStatus: vi.fn(),
      retriageTicket: vi.fn(),
      submitReview: vi.fn(),
    };

    const tickets = [
      makeTestTicket("T-A", { createdAt: "2026-10-05T10:00:00.000Z" }),
      makeTestTicket("T-B", { createdAt: "2026-10-05T09:00:00.000Z" }),
      makeTestTicket("T-C", { createdAt: "2026-10-05T08:00:00.000Z" }),
    ];

    const store = makeStore(undefined, { api: mockApi });
    store.dispatch(ticketsSeeded({ tickets }));

    render(
      <Provider store={store}>
        <TicketsWorkspace filters={EMPTY_FILTERS} />
      </Provider>
    );

    // Select all visible
    const selectAll = screen.getByLabelText("Select all visible tickets");
    fireEvent.click(selectAll);

    expect(screen.getAllByText("3 selected").length).toBeGreaterThan(0);

    // Run claim
    const claimBtn = screen.getAllByRole("button", { name: /^claim$/i })[0];
    await act(async () => {
      fireEvent.click(claimBtn);
    });

    expect(claimedIds).toEqual(["T-A", "T-B", "T-C"]);
  });
});
