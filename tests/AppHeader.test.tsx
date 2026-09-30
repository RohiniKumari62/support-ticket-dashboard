/**
 * AppHeader integration test
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { Provider } from "react-redux";
import { AppHeader } from "@/components/layout/AppHeader";
import { makeStore } from "@/lib/store/store";
import { ticketsSeeded } from "@/lib/store/tickets-slice";
import { agentHydrated } from "@/lib/store/agent-slice";
import type { Ticket } from "@/types/ticket";

// Mock next/navigation — usePathname is called inside NavLinks (client component)
const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

// Mock next/link to render a plain <a> so we can query by role/href
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function renderHeader(store = makeStore()) {
  return render(
    <Provider store={store}>
      <AppHeader />
    </Provider>
  );
}

describe("AppHeader", () => {
  beforeEach(() => {
    // Default: on /tickets
    mockUsePathname.mockReturnValue("/tickets");
  });

  it("renders the brand name", () => {
    renderHeader();
    expect(screen.getByText("Support Desk")).toBeInTheDocument();
  });

  it("renders the Tickets nav link pointing to /tickets", () => {
    renderHeader();
    const link = screen.getByRole("link", { name: "Tickets" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/tickets");
  });

  it("renders the To review nav link with dynamic count pointing to /review", () => {
    const store = makeStore();
    const sampleTicket: Ticket = {
      id: "T-1",
      customerId: "C-1",
      plan: "pro",
      subject: "Sub",
      body: "Body",
      attachmentUrl: null,
      createdAt: "2026-09-20T10:00:00Z",
      status: "open",
      assignedTo: null,
      assignedToUnknown: null,
      category: "billing",
      priority: "P1",
      aiPriority: null,
      summary: null,
      triageDecision: "manual_review",
      reviewReason: null,
      dataIssues: [],
      humanReview: null,
      version: 1,
      updatedAt: "2026-09-20T10:00:00Z",
    };
    store.dispatch(ticketsSeeded({ tickets: [sampleTicket] }));

    renderHeader(store);
    const link = screen.getByRole("link", { name: "To review (1)" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/review");
  });

  it("renders the My tickets count placeholder when unhydrated, and count when hydrated", () => {
    const store = makeStore();
    const { rerender } = renderHeader(store);
    expect(screen.getByText("My tickets (–)")).toBeInTheDocument();

    // Hydrate
    store.dispatch(agentHydrated("agent-1"));
    rerender(
      <Provider store={store}>
        <AppHeader />
      </Provider>
    );
    expect(screen.getByText("My tickets (0)")).toBeInTheDocument();
  });

  it("renders 3 agent options: Priya, Rahul, Meera and updates on change", async () => {
    const store = makeStore();
    store.dispatch(agentHydrated("agent-1"));
    renderHeader(store);

    expect(screen.getByRole("option", { name: "Priya" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Rahul" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Meera" })).toBeInTheDocument();

    const select = screen.getByLabelText("Agent");
    await userEvent.selectOptions(select, "agent-2");

    expect(store.getState().agent.currentAgentId).toBe("agent-2");
  });

  it("marks Tickets link as active (aria-current=page) on /tickets", () => {
    mockUsePathname.mockReturnValue("/tickets");
    renderHeader();
    const ticketsLink = screen.getByRole("link", { name: "Tickets" });
    const reviewLink = screen.getByRole("link", { name: /To review/i });
    expect(ticketsLink).toHaveAttribute("aria-current", "page");
    expect(reviewLink).not.toHaveAttribute("aria-current");
  });

  it("marks Tickets link as active on /tickets/[id] sub-routes", () => {
    mockUsePathname.mockReturnValue("/tickets/abc-123");
    renderHeader();
    const ticketsLink = screen.getByRole("link", { name: "Tickets" });
    expect(ticketsLink).toHaveAttribute("aria-current", "page");
  });

  it("marks To review link as active on /review", () => {
    mockUsePathname.mockReturnValue("/review");
    renderHeader();
    const reviewLink = screen.getByRole("link", { name: /To review/i });
    const ticketsLink = screen.getByRole("link", { name: "Tickets" });
    expect(reviewLink).toHaveAttribute("aria-current", "page");
    expect(ticketsLink).not.toHaveAttribute("aria-current");
  });

  it("has an Agent label associated with the select", () => {
    renderHeader();
    const select = screen.getByLabelText("Agent");
    expect(select.tagName).toBe("SELECT");
  });
});
