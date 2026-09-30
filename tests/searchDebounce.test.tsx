import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TicketFilters } from "@/components/tickets/TicketFilters";

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: vi.fn() }),
  usePathname: () => "/tickets",
}));

describe("Search and Filter Debounce Performance", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockReplace.mockClear();
    mockPush.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("N rapid keystrokes trigger exactly ONE navigation call after 300ms", () => {
    render(
      <TicketFilters
        filters={{ q: "", status: null, priority: null, category: null, decision: null }}
        totalCount={5000}
        resultCount={5000}
      />
    );

    const input = screen.getByLabelText("Search subject and body");

    // Simulate rapid keystrokes: 'b', 'i', 'l', 'l'
    act(() => {
      fireEvent.change(input, { target: { value: "b" } });
      vi.advanceTimersByTime(50);
      fireEvent.change(input, { target: { value: "bi" } });
      vi.advanceTimersByTime(50);
      fireEvent.change(input, { target: { value: "bil" } });
      vi.advanceTimersByTime(50);
      fireEvent.change(input, { target: { value: "bill" } });
    });

    // Before 300ms has elapsed since the last keystroke, no navigation should occur
    expect(mockReplace).not.toHaveBeenCalled();

    // Advance 299ms: still no call
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(mockReplace).not.toHaveBeenCalled();

    // Advance 1ms more (reaching 300ms): exactly ONE navigation occurs with final value
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/tickets?q=bill", { scroll: false });
  });

  it("Enter key immediately flushes the search without waiting for 300ms", () => {
    render(
      <TicketFilters
        filters={{ q: "", status: null, priority: null, category: null, decision: null }}
        totalCount={5000}
        resultCount={5000}
      />
    );

    const input = screen.getByLabelText("Search subject and body");

    act(() => {
      fireEvent.change(input, { target: { value: "urgent" } });
    });
    expect(mockReplace).not.toHaveBeenCalled();

    // Press Enter immediately
    act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    // Navigates immediately
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/tickets?q=urgent", { scroll: false });

    // Advancing 300ms should NOT trigger a second call
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
});
