import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Provider } from "react-redux";
import { TicketDetail } from "@/components/tickets/detail/TicketDetail";
import { normalizeTickets } from "@/lib/tickets/normalize";
import { TEST_TICKETS } from "@/data/test-tickets";
import { makeStore } from "@/lib/store/store";
import { ticketsSeeded } from "@/lib/store/tickets-slice";
import type { Ticket } from "@/types/ticket";

describe("TicketDetail rendering", () => {
  const fixedNow = new Date("2026-09-29T12:00:00Z");
  const { tickets } = normalizeTickets(TEST_TICKETS, fixedNow);

  const getTicket = (id: string): Ticket => {
    const t = tickets.find((item) => item.id === id);
    if (!t) throw new Error(`Ticket ${id} not found in TEST_TICKETS`);
    return t;
  };

  const currentAgent = "agent-1"; // Priya

  function renderWithStore(ticket: Ticket) {
    const store = makeStore();
    store.dispatch(ticketsSeeded({ tickets: [ticket] }));
    return renderToStaticMarkup(
      <Provider store={store}>
        <TicketDetail ticket={ticket} currentAgentId={currentAgent} />
      </Provider>
    );
  }

  it("T-2002: body shows escaped text and produces no real <img and no onerror= attribute", () => {
    const html = renderWithStore(getTicket("T-2002"));

    expect(html).toContain("&lt;img src=x onerror=&quot;alert(&#x27;hacked&#x27;)&quot;&gt;");
    expect(html).not.toMatch(/<img\s/i);
    expect(html).not.toMatch(/<[^>]+onerror\s*=/i);
  });

  it("T-2003: shows the 'Attachment link blocked' message and no javascript: link", () => {
    const html = renderWithStore(getTicket("T-2003"));

    expect(html).toContain("Attachment link blocked: it isn&#x27;t a safe web address.");
    expect(html).not.toContain("javascript:");
  });

  it("T-2010: shows a safe https link with rel='noopener noreferrer' and target='_blank'", () => {
    const html = renderWithStore(getTicket("T-2010"));

    expect(html).toContain('href="https://files.example.com/screenshots/export-bug.png"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("T-2007: shows both 'P1' and 'P3' plus the enterprise explanation", () => {
    const html = renderWithStore(getTicket("T-2007"));

    expect(html).toContain("Final priority P1 · AI suggested P3");
    expect(html).toContain("Raised to P1 because enterprise tickets are always at least P1");
  });

  it("T-2011: summary containing <img onerror> is escaped as literal text", () => {
    const html = renderWithStore(getTicket("T-2011"));

    expect(html).toContain("&lt;img src=x onerror=&quot;alert(&#x27;summary&#x27;)&quot;&gt;");
    expect(html).not.toMatch(/<img\s/i);
    expect(html).not.toMatch(/<[^>]+onerror\s*=/i);
  });

  it("T-2006: shows '(No subject)' and '(No body)'", () => {
    const html = renderWithStore(getTicket("T-2006"));

    expect(html).toContain("(No subject)");
    expect(html).toContain("(No body)");
  });

  it("T-2010: closed ticket shows no status buttons and note", () => {
    const html = renderWithStore(getTicket("T-2010"));

    expect(html).toContain("Closed tickets can&#x27;t be changed.");
    expect(html).not.toContain("Start progress");
    expect(html).not.toContain("Mark resolved");
    expect(html).not.toContain("Reopen");
  });

  it("T-2005: assigned to Rahul (agent-2) shows 'Assigned to Rahul' and disabled Claim", () => {
    const html = renderWithStore(getTicket("T-2005"));

    expect(html).toContain("Assigned to Rahul");
    // Claim button is not rendered when already assigned to another agent
    expect(html).not.toContain("Claim ticket");
  });

  it("T-2009: shows the unknown-agent text", () => {
    const html = renderWithStore(getTicket("T-2009"));

    expect(html).toContain("Unknown agent");
  });
});
