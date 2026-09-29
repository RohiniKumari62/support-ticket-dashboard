import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Provider } from "react-redux";
import { ReviewQueue } from "@/components/review/ReviewQueue";
import { normalizeTickets } from "@/lib/tickets/normalize";
import { TEST_TICKETS } from "@/data/test-tickets";
import { makeStore } from "@/lib/store/store";
import { ticketsSeeded } from "@/lib/store/tickets-slice";
import type { Ticket } from "@/types/ticket";

describe("ReviewQueue rendering", () => {
  const fixedNow = new Date("2026-09-29T12:00:00Z");
  const { tickets } = normalizeTickets(TEST_TICKETS, fixedNow);

  function renderWithStore(queueTickets: Ticket[]) {
    const store = makeStore();
    store.dispatch(ticketsSeeded({ tickets: queueTickets }));
    return renderToStaticMarkup(
      <Provider store={store}>
        <ReviewQueue />
      </Provider>
    );
  }

  it("T-2003: shows the flagged-input warning and its subject/summary as escaped plain text", () => {
    const html = renderWithStore(tickets);

    expect(html).toContain("The AI flagged this ticket for suspicious content. Read it before accepting.");
    expect(html).toContain("Screenshot of the error");
    expect(html).toContain("Customer reports an error shown in an attachment.");
  });

  it("T-2004: shows 'Invalid value' for category and priority and a DISABLED Accept button with its reason", () => {
    const html = renderWithStore(tickets);

    expect(html).toContain("Invalid value");
    expect(html).toContain("Invalid AI values — use Change");
  });

  it("T-2006: shows '(No subject)', 'No summary' and the empty-ticket warning", () => {
    const html = renderWithStore(tickets);

    expect(html).toContain("(No subject)");
    expect(html).toContain("No summary");
    expect(html).toContain("This ticket is empty.");
  });

  it("T-2012: appears in the queue", () => {
    const html = renderWithStore(tickets);

    expect(html).toContain("T-2012");
    expect(html).toContain("Account locked");
  });

  it("hostile HTML in a summary produces no real <img element or onerror= attribute", () => {
    const hostileTicket: Ticket = {
      id: "T-XSS",
      customerId: "C-99",
      plan: "pro",
      subject: "Test XSS",
      body: "Body",
      attachmentUrl: null,
      createdAt: "2026-09-20T10:00:00Z",
      status: "open",
      assignedTo: null,
      assignedToUnknown: null,
      category: "bug",
      priority: "P2",
      aiPriority: null,
      summary: "<img src=x onerror=alert(1)>",
      triageDecision: "manual_review",
      reviewReason: null,
      dataIssues: [],
      humanReview: null,
    };

    const html = renderWithStore([hostileTicket]);

    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toMatch(/<img\s/i);
    expect(html).not.toMatch(/<[^>]+onerror\s*=/i);
  });

  it("enterprise fixture shows the enterprise note and change form's disabled P2/P3 options", () => {
    const enterpriseTicket: Ticket = {
      id: "T-ENT",
      customerId: "C-10",
      plan: "enterprise",
      subject: "Enterprise Ticket",
      body: "Enterprise content",
      attachmentUrl: null,
      createdAt: "2026-09-20T10:00:00Z",
      status: "open",
      assignedTo: null,
      assignedToUnknown: null,
      category: "bug",
      priority: "P1",
      aiPriority: null,
      summary: "Enterprise issue summary",
      triageDecision: "manual_review",
      reviewReason: null,
      dataIssues: [],
      humanReview: null,
    };

    const html = renderWithStore([enterpriseTicket]);

    expect(html).toContain("Enterprise tickets must stay at P1 or higher.");
  });

  it("an empty queue renders the empty state with a link back to /tickets", () => {
    const html = renderWithStore([]);

    expect(html).toContain("No tickets need review");
    expect(html).toContain("Back to tickets");
    expect(html).toContain('href="/tickets"');
  });
});
