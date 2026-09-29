import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { TicketList } from "@/components/tickets/TicketList";
import { normalizeTickets } from "@/lib/tickets/normalize";
import { TEST_TICKETS } from "@/data/test-tickets";
import { makeStore } from "@/lib/store/store";
import { ticketsSeeded } from "@/lib/store/tickets-slice";
import type { Ticket } from "@/types/ticket";

describe("TicketList security and safe rendering", () => {
  const fixedNow = new Date("2026-09-29T12:00:00Z");
  const { tickets, duplicatesRemoved } = normalizeTickets(
    TEST_TICKETS,
    fixedNow
  );

  function renderWithStore(listTickets: Ticket[], dups = 0, hasActiveFilters = false) {
    const store = makeStore();
    store.dispatch(ticketsSeeded({ tickets: listTickets, duplicatesRemoved: dups }));
    return render(
      <Provider store={store}>
        <TicketList
          tickets={listTickets}
          duplicatesRemoved={dups}
          hasActiveFilters={hasActiveFilters}
        />
      </Provider>
    );
  }

  function renderMarkupWithStore(listTickets: Ticket[], dups = 0, hasActiveFilters = false) {
    const store = makeStore();
    store.dispatch(ticketsSeeded({ tickets: listTickets, duplicatesRemoved: dups }));
    return renderToStaticMarkup(
      <Provider store={store}>
        <TicketList
          tickets={listTickets}
          duplicatesRemoved={dups}
          hasActiveFilters={hasActiveFilters}
        />
      </Provider>
    );
  }

  it("renders raw customer HTML as plain escaped text without executing scripts", () => {
    const html = renderMarkupWithStore(tickets, duplicatesRemoved);

    // Assert that HTML tags in subjects (T-2002: <b>Refund</b>) are escaped, not HTML elements
    expect(html).toContain("&lt;b&gt;Refund&lt;/b&gt;");

    // Assert NO unescaped <img> tags or onerror attributes were rendered
    expect(html).not.toMatch(/<img\s/i);
    expect(html).not.toContain("onerror=");

    // Assert NO javascript: pseudo-protocol links exist anywhere
    expect(html).not.toContain("javascript:");
  });

  it("displays duplicate tickets notice when duplicatesRemoved > 0", () => {
    renderWithStore(tickets, duplicatesRemoved);

    expect(screen.getByText("1 duplicate ticket ignored")).toBeInTheDocument();
  });

  it("renders the EmptyTickets state when list is empty", () => {
    renderWithStore([]);

    expect(screen.getByText("No tickets found")).toBeInTheDocument();
    expect(
      screen.getByText("There are currently no tickets matching your view.")
    ).toBeInTheDocument();
  });

  it("renders no-match empty state when hasActiveFilters is true", () => {
    const html = renderMarkupWithStore([], 0, true);

    expect(html).toContain("No tickets match your filters");
    // Must include a link back to /tickets
    expect(html).toContain('href="/tickets"');
  });

  it("no-match state: hostile content from T-2002/T-2011 remains escaped in non-empty list", () => {
    const html = renderMarkupWithStore(tickets, duplicatesRemoved);

    // No real <img elements or onerror= attributes in the output
    expect(html).not.toMatch(/<img\s/i);
    expect(html).not.toContain("onerror=");
    expect(html).not.toContain("javascript:");
  });
});
