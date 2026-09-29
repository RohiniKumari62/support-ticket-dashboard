import { describe, expect, it } from "vitest";
import {
  filterTickets,
  hasActiveFilters,
  parseTicketFilters,
  serializeTicketFilters,
  type TicketFilters,
} from "@/lib/tickets/filters";
import { normalizeTickets } from "@/lib/tickets/normalize";
import { TEST_TICKETS } from "@/data/test-tickets";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = new Date("2026-09-29T12:00:00Z");
const { tickets: ALL_TICKETS } = normalizeTickets(TEST_TICKETS, NOW);

const EMPTY_FILTERS: TicketFilters = {
  q: "",
  status: null,
  priority: null,
  category: null,
  decision: null,
};

// ─── parseTicketFilters ───────────────────────────────────────────────────────

describe("parseTicketFilters", () => {
  it("returns empty filters for empty params", () => {
    expect(parseTicketFilters({})).toEqual(EMPTY_FILTERS);
  });

  it("parses all valid fields", () => {
    const result = parseTicketFilters({
      q: "hello",
      status: "open",
      priority: "P1",
      category: "billing",
      decision: "manual_review",
    });
    expect(result).toEqual({
      q: "hello",
      status: "open",
      priority: "P1",
      category: "billing",
      decision: "manual_review",
    });
  });

  it("ignores invalid enum value for status ('banana')", () => {
    const result = parseTicketFilters({ status: "banana" });
    expect(result.status).toBeNull();
  });

  it("ignores lowercase priority ('p1' — must be case-sensitive)", () => {
    const result = parseTicketFilters({ priority: "p1" });
    expect(result.priority).toBeNull();
  });

  it("ignores out-of-range priority ('P5')", () => {
    const result = parseTicketFilters({ priority: "P5" });
    expect(result.priority).toBeNull();
  });

  it("ignores invalid decision value ('maybe')", () => {
    const result = parseTicketFilters({ decision: "maybe" });
    expect(result.decision).toBeNull();
  });

  it("uses the first value when a key is repeated (array)", () => {
    const result = parseTicketFilters({ status: ["open", "closed"] });
    expect(result.status).toBe("open");
  });

  it("trims and collapses internal whitespace in q", () => {
    const result = parseTicketFilters({ q: "  hello   world  " });
    expect(result.q).toBe("hello world");
  });

  it("caps q at 100 characters", () => {
    const longQ = "a".repeat(200);
    const result = parseTicketFilters({ q: longQ });
    expect(result.q).toHaveLength(100);
  });

  it("keeps HTML-like q as plain text without crashing", () => {
    const hostile = "<img src=x onerror=alert(1)>";
    const result = parseTicketFilters({ q: hostile });
    expect(result.q).toBe(hostile); // kept as plain text, no crash
  });
});

// ─── filterTickets ────────────────────────────────────────────────────────────

describe("filterTickets", () => {
  it("returns all tickets when no filters are active", () => {
    const result = filterTickets(ALL_TICKETS, EMPTY_FILTERS);
    expect(result).toHaveLength(ALL_TICKETS.length);
  });

  it("searches by subject (case-insensitive)", () => {
    const result = filterTickets(ALL_TICKETS, { ...EMPTY_FILTERS, q: "sso" });
    expect(result.some((t) => t.id === "T-2001")).toBe(true);
    expect(result.every((t) => t.subject.toLowerCase().includes("sso") || (t.body?.toLowerCase().includes("sso") ?? false))).toBe(true);
  });

  it("searches by body (case-insensitive)", () => {
    const result = filterTickets(ALL_TICKETS, { ...EMPTY_FILTERS, q: "charged twice" });
    expect(result.some((t) => t.id === "T-2002")).toBe(true);
  });

  it("handles search with uppercase query", () => {
    const lc = filterTickets(ALL_TICKETS, { ...EMPTY_FILTERS, q: "invoice" });
    const uc = filterTickets(ALL_TICKETS, { ...EMPTY_FILTERS, q: "INVOICE" });
    expect(lc.map((t) => t.id).sort()).toEqual(uc.map((t) => t.id).sort());
  });

  it("does not crash on T-2006 (null body)", () => {
    const t2006 = ALL_TICKETS.find((t) => t.id === "T-2006");
    expect(t2006?.body).toBeNull();
    expect(() =>
      filterTickets(ALL_TICKETS, { ...EMPTY_FILTERS, q: "anything" })
    ).not.toThrow();
  });

  it("matches T-2002 body as plain text when searching 'img'", () => {
    const result = filterTickets(ALL_TICKETS, { ...EMPTY_FILTERS, q: "img src=x" });
    expect(result.some((t) => t.id === "T-2002")).toBe(true);
  });

  it("filters by status=open", () => {
    const result = filterTickets(ALL_TICKETS, { ...EMPTY_FILTERS, status: "open" });
    expect(result.every((t) => t.status === "open")).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("filters by priority=P0", () => {
    const result = filterTickets(ALL_TICKETS, { ...EMPTY_FILTERS, priority: "P0" });
    expect(result.every((t) => t.priority === "P0")).toBe(true);
    expect(result.some((t) => t.id === "T-2001")).toBe(true);
  });

  it("filters by category=billing", () => {
    const result = filterTickets(ALL_TICKETS, { ...EMPTY_FILTERS, category: "billing" });
    expect(result.every((t) => t.category === "billing")).toBe(true);
    expect(result.some((t) => t.id === "T-2002")).toBe(true);
  });

  it("filters by decision=manual_review", () => {
    const result = filterTickets(ALL_TICKETS, { ...EMPTY_FILTERS, decision: "manual_review" });
    expect(result.every((t) => t.triageDecision === "manual_review")).toBe(true);
    // T-2012 "maybe" normalized to manual_review
    expect(result.some((t) => t.id === "T-2012")).toBe(true);
  });

  it("AND-combines filters: status + priority", () => {
    const result = filterTickets(ALL_TICKETS, {
      ...EMPTY_FILTERS,
      status: "open",
      priority: "P2",
    });
    expect(result.every((t) => t.status === "open" && t.priority === "P2")).toBe(true);
  });

  it("excludes T-2004 (null priority) when priority filter is active", () => {
    const result = filterTickets(ALL_TICKETS, { ...EMPTY_FILTERS, priority: "P2" });
    expect(result.some((t) => t.id === "T-2004")).toBe(false);
  });

  it("includes T-2004 when no priority filter is active", () => {
    const result = filterTickets(ALL_TICKETS, EMPTY_FILTERS);
    expect(result.some((t) => t.id === "T-2004")).toBe(true);
  });

  it("returns empty array when nothing matches", () => {
    const result = filterTickets(ALL_TICKETS, {
      ...EMPTY_FILTERS,
      q: "zzzz_no_match_zzz",
    });
    expect(result).toHaveLength(0);
  });

  it("preserves input order (does not re-sort)", () => {
    const ids = ALL_TICKETS.map((t) => t.id);
    const result = filterTickets(ALL_TICKETS, EMPTY_FILTERS);
    expect(result.map((t) => t.id)).toEqual(ids);
  });
});

// ─── serializeTicketFilters ──────────────────────────────────────────────────

describe("serializeTicketFilters", () => {
  it("returns '' for empty filters", () => {
    expect(serializeTicketFilters(EMPTY_FILTERS)).toBe("");
  });

  it("omits empty/null values", () => {
    const qs = serializeTicketFilters({ ...EMPTY_FILTERS, status: "open" });
    expect(qs).toBe("status=open");
    expect(qs).not.toContain("q=");
    expect(qs).not.toContain("priority=");
  });

  it("uses stable param order (q, status, priority, category, decision)", () => {
    const qs = serializeTicketFilters({
      q: "hello",
      status: "open",
      priority: "P1",
      category: "billing",
      decision: "manual_review",
    });
    const keys = [...new URLSearchParams(qs).keys()];
    expect(keys).toEqual(["q", "status", "priority", "category", "decision"]);
  });

  it("round-trips: parse(serialize(x)) equals x", () => {
    const original: TicketFilters = {
      q: "test query",
      status: "in_progress",
      priority: "P2",
      category: "bug",
      decision: "auto_accept",
    };
    const qs = serializeTicketFilters(original);
    const parsed = parseTicketFilters(Object.fromEntries(new URLSearchParams(qs)));
    expect(parsed).toEqual(original);
  });

  it("encodes special characters in q correctly", () => {
    const qs = serializeTicketFilters({ ...EMPTY_FILTERS, q: "hello & world=1" });
    expect(qs).toContain("q=");
    // Must be URL-encoded
    expect(qs).not.toContain("&world");
    // Should round-trip
    const decoded = new URLSearchParams(qs).get("q");
    expect(decoded).toBe("hello & world=1");
  });
});

// ─── hasActiveFilters ─────────────────────────────────────────────────────────

describe("hasActiveFilters", () => {
  it("returns false for empty filters", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("returns true when q is set", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, q: "hello" })).toBe(true);
  });

  it("returns true when any select filter is set", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, status: "open" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, priority: "P0" })).toBe(true);
  });
});
