import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { render, screen } from "@testing-library/react";
import { TicketList } from "@/components/tickets/TicketList";
import { normalizeTickets } from "@/lib/tickets/normalize";
import { TEST_TICKETS } from "@/data/test-tickets";

describe("TicketList security and safe rendering", () => {
  const fixedNow = new Date("2026-09-29T12:00:00Z");
  const { tickets, duplicatesRemoved } = normalizeTickets(
    TEST_TICKETS,
    fixedNow
  );

  it("renders raw customer HTML as plain escaped text without executing scripts", () => {
    const html = renderToStaticMarkup(
      <TicketList tickets={tickets} duplicatesRemoved={duplicatesRemoved} />
    );

    // Assert that HTML tags in subjects (T-2002: <b>Refund</b>) are escaped, not HTML elements
    expect(html).toContain("&lt;b&gt;Refund&lt;/b&gt;");

    // Assert NO unescaped <img> tags or onerror attributes were rendered
    expect(html).not.toMatch(/<img\s/i);
    expect(html).not.toContain("onerror=");

    // Assert NO javascript: pseudo-protocol links exist anywhere
    expect(html).not.toContain("javascript:");
  });

  it("displays duplicate tickets notice when duplicatesRemoved > 0", () => {
    render(
      <TicketList tickets={tickets} duplicatesRemoved={duplicatesRemoved} />
    );

    expect(screen.getByText("1 duplicate ticket ignored")).toBeInTheDocument();
  });

  it("renders the EmptyTickets state when list is empty", () => {
    render(<TicketList tickets={[]} />);

    expect(screen.getByText("No tickets found")).toBeInTheDocument();
    expect(
      screen.getByText("There are currently no tickets matching your view.")
    ).toBeInTheDocument();
  });

  it("renders no-match empty state when hasActiveFilters is true", () => {
    const html = renderToStaticMarkup(
      <TicketList tickets={[]} hasActiveFilters={true} />
    );

    expect(html).toContain("No tickets match your filters");
    // Must include a link back to /tickets
    expect(html).toContain('href="/tickets"');
  });

  it("no-match state: hostile content from T-2002/T-2011 remains escaped in non-empty list", () => {
    const html = renderToStaticMarkup(
      <TicketList tickets={tickets} duplicatesRemoved={duplicatesRemoved} />
    );

    // No real <img elements or onerror= attributes in the output
    expect(html).not.toMatch(/<img\s/i);
    expect(html).not.toContain("onerror=");
    expect(html).not.toContain("javascript:");
  });
});
