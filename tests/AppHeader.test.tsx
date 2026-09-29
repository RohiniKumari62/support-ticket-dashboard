/**
 * AppHeader integration test
 *
 * Verifies:
 * - Brand text renders
 * - Both nav links are present with correct hrefs
 * - "My tickets (–)" placeholder text renders
 * - "To review (–)" placeholder text renders in nav
 * - All 3 agents appear as select options
 * - aria-current="page" is set on the active link
 * - The inactive link does NOT have aria-current
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppHeader } from "@/components/layout/AppHeader";

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

describe("AppHeader", () => {
  beforeEach(() => {
    // Default: on /tickets
    mockUsePathname.mockReturnValue("/tickets");
  });

  it("renders the brand name", () => {
    render(<AppHeader />);
    expect(screen.getByText("Support Desk")).toBeInTheDocument();
  });

  it("renders the Tickets nav link pointing to /tickets", () => {
    render(<AppHeader />);
    const link = screen.getByRole("link", { name: "Tickets" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/tickets");
  });

  it("renders the To review nav link pointing to /review", () => {
    render(<AppHeader />);
    const link = screen.getByRole("link", { name: "To review (–)" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/review");
  });

  it("renders the My tickets count placeholder", () => {
    render(<AppHeader />);
    expect(screen.getByText("My tickets (–)")).toBeInTheDocument();
  });

  it("renders 3 agent options: Priya, Rahul, Meera", () => {
    render(<AppHeader />);
    expect(screen.getByRole("option", { name: "Priya" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Rahul" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Meera" })).toBeInTheDocument();
  });

  it("marks Tickets link as active (aria-current=page) on /tickets", () => {
    mockUsePathname.mockReturnValue("/tickets");
    render(<AppHeader />);
    const ticketsLink = screen.getByRole("link", { name: "Tickets" });
    const reviewLink = screen.getByRole("link", { name: "To review (–)" });
    expect(ticketsLink).toHaveAttribute("aria-current", "page");
    expect(reviewLink).not.toHaveAttribute("aria-current");
  });

  it("marks Tickets link as active on /tickets/[id] sub-routes", () => {
    mockUsePathname.mockReturnValue("/tickets/abc-123");
    render(<AppHeader />);
    const ticketsLink = screen.getByRole("link", { name: "Tickets" });
    expect(ticketsLink).toHaveAttribute("aria-current", "page");
  });

  it("marks To review link as active on /review", () => {
    mockUsePathname.mockReturnValue("/review");
    render(<AppHeader />);
    const reviewLink = screen.getByRole("link", { name: "To review (–)" });
    const ticketsLink = screen.getByRole("link", { name: "Tickets" });
    expect(reviewLink).toHaveAttribute("aria-current", "page");
    expect(ticketsLink).not.toHaveAttribute("aria-current");
  });

  it("has an Agent label associated with the select", () => {
    render(<AppHeader />);
    const select = screen.getByLabelText("Agent");
    expect(select.tagName).toBe("SELECT");
  });
});
