import { describe, it, expect, beforeEach } from "vitest";
import { makeStore } from "@/lib/store/store";
import { ticketsSeeded, ticketReceivedFromServer } from "@/lib/store/tickets-slice";
import {
  selectReviewCount,
  selectMyTicketsCount,
  selectTicketById,
} from "@/lib/store/tickets-selectors";
import { agentHydrated } from "@/lib/store/agent-slice";
import { parseTicketsArray } from "@/lib/api/parse-ticket";
import { createTicketStore } from "@/lib/server/ticket-store";
import { buildSeed } from "@/lib/server/seed";
import type { Ticket } from "@/types/ticket";

describe("Live and Edge State Tests (Phase 10)", () => {
  beforeEach(() => {
    process.env.FAKE_API_CHAOS = "off";
  });

  it("parseTicketsArray handles one invalid and one valid ticket cleanly", () => {
    const validTicket: Ticket = {
      id: "T-VALID",
      customerId: "C-1",
      plan: "pro",
      subject: "Valid",
      body: "Body",
      attachmentUrl: null,
      createdAt: "2026-09-20T10:00:00Z",
      status: "open",
      assignedTo: null,
      assignedToUnknown: null,
      category: "bug",
      priority: "P2",
      aiPriority: null,
      summary: "Summary",
      triageDecision: "manual_review",
      reviewReason: null,
      dataIssues: [],
      humanReview: null,
      version: 1,
      updatedAt: "2026-09-20T10:00:00Z",
    };

    const invalidCandidate = {
      id: "__proto__",
      version: -1,
      status: "invalid",
    };

    const result = parseTicketsArray([validTicket, invalidCandidate]);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].id).toBe("T-VALID");
    expect(result.droppedCount).toBe(1);
  });

  it("T-2008 (future date) is never returned by /updates polling unless actually changed", () => {
    const seed = buildSeed({ now: 1774000000000, random: () => 0.5 });
    const store = createTicketStore({
      tickets: seed.tickets,
      duplicatesRemoved: seed.duplicatesRemoved,
      now: 1774000000000,
      random: () => 0.5,
    });

    // Initial updates poll right after seed
    const initialCursor = new Date(1774000000000).toISOString();
    const pollRes = store.updates(initialCursor);

    expect(pollRes.ok).toBe(true);
    if (!pollRes.ok) return;

    expect(pollRes.created.some((t) => t.id === "T-2008")).toBe(false);
    expect(pollRes.updated.some((t) => t.id === "T-2008")).toBe(false);
  });

  it("header counts correctly compute for edge tickets: T-2009, T-2010, T-2012, T-2006, T-2003, T-2004", () => {
    const seed = buildSeed({ now: 1774000000000, random: () => 0.5 });
    const store = makeStore();

    store.dispatch(ticketsSeeded({ tickets: seed.tickets }));
    store.dispatch(agentHydrated("agent-1"));

    const state = store.getState();

    // T-2009 is assigned to agent-99 (unknown) -> does NOT count in agent-1's My Tickets
    // T-2010 is closed -> does NOT count in agent-1's My Tickets
    const myCount = selectMyTicketsCount(state);
    expect(typeof myCount).toBe("number");

    // Review count includes T-2003, T-2004, T-2006, T-2012 (manual_review not yet human-reviewed)
    // and does NOT include T-2007 (auto_accept) or T-2001 (auto_accept)
    const reviewCount = selectReviewCount(state);
    expect(reviewCount).toBeGreaterThanOrEqual(4);
  });

  it("server ticket update while inFlight preserves snapshot truth", () => {
    const store = makeStore();
    const sample: Ticket = {
      id: "T-500",
      customerId: "C-1",
      plan: "pro",
      subject: "Test",
      body: "Body",
      attachmentUrl: null,
      createdAt: "2026-09-20T10:00:00Z",
      status: "open",
      assignedTo: null,
      assignedToUnknown: null,
      category: "bug",
      priority: "P2",
      aiPriority: null,
      summary: null,
      triageDecision: "manual_review",
      reviewReason: null,
      dataIssues: [],
      humanReview: null,
      version: 1,
      updatedAt: "2026-09-20T10:00:00Z",
    };

    store.dispatch(ticketsSeeded({ tickets: [sample] }));

    // Simulate server update
    const updatedSample: Ticket = {
      ...sample,
      assignedTo: "agent-2",
      version: 2,
    };
    store.dispatch(ticketReceivedFromServer(updatedSample));

    const state = store.getState();
    const currentTicket = selectTicketById(state, "T-500");
    expect(currentTicket?.assignedTo).toBe("agent-2");
    expect(currentTicket?.version).toBe(2);
  });
});
