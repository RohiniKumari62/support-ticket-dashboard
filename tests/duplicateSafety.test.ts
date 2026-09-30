import { describe, it, expect, beforeEach } from "vitest";
import { makeStore } from "@/lib/store/store";
import { ticketsSeeded } from "@/lib/store/tickets-slice";
import { pollSucceeded } from "@/lib/store/live-slice";
import { selectTicketIds } from "@/lib/store/tickets-selectors";
import { createTicketStore } from "@/lib/server/ticket-store";
import { buildSeed } from "@/lib/server/seed";
import type { Ticket } from "@/types/ticket";

const sampleTicket: Ticket = {
  id: "T-2001",
  customerId: "C-12",
  plan: "enterprise",
  subject: "SSO login down for whole team",
  body: "Body",
  attachmentUrl: null,
  createdAt: "2026-09-20T09:15:00Z",
  status: "open",
  assignedTo: null,
  assignedToUnknown: null,
  category: "account_access",
  priority: "P0",
  aiPriority: null,
  summary: "Summary",
  triageDecision: "auto_accept",
  reviewReason: null,
  dataIssues: [],
  humanReview: null,
  version: 1,
  updatedAt: "2026-09-20T09:15:00Z",
};

describe("Duplicate Safety (Phase 10)", () => {
  beforeEach(() => {
    process.env.FAKE_API_CHAOS = "off";
  });

  it("server seed contains exactly one T-2001 despite duplicate raw entries", () => {
    const seed = buildSeed({ now: 1774000000000, random: () => 0.5 });
    const store = createTicketStore({
      tickets: seed.tickets,
      duplicatesRemoved: seed.duplicatesRemoved,
      now: 1774000000000,
      random: () => 0.5,
    });

    const inSeed = seed.tickets.filter((t) => t.id === "T-2001");
    expect(inSeed).toHaveLength(1);
    const t2001Res = store.get("T-2001");
    expect(t2001Res.ok).toBe(true);
    expect(store.getDuplicatesRemoved()).toBe(1);
  });

  it("pagination walk produces zero duplicate IDs across pages", () => {
    const seed = buildSeed({ now: 1774000000000, random: () => 0.5 });
    const store = createTicketStore({
      tickets: seed.tickets,
      duplicatesRemoved: seed.duplicatesRemoved,
      now: 1774000000000,
      random: () => 0.5,
    });

    const seenIds = new Set<string>();
    let cursor: string | null = null;
    let pageCount = 0;

    // Walk 10 pages
    while (pageCount < 10) {
      const res = store.list({ limit: 50, cursor: cursor ?? undefined });
      expect(res.ok).toBe(true);
      if (!res.ok) break;

      for (const t of res.tickets) {
        expect(seenIds.has(t.id)).toBe(false);
        seenIds.add(t.id);
      }

      if (!res.nextCursor) break;
      cursor = res.nextCursor;
      pageCount++;
    }
  });

  it("ticketsSeeded with duplicate tickets creates single byId entry and unique ids array", () => {
    const store = makeStore();
    store.dispatch(
      ticketsSeeded({
        tickets: [sampleTicket, sampleTicket, { ...sampleTicket, id: "T-2002" }],
        duplicatesRemoved: 1,
      })
    );

    const ids = selectTicketIds(store.getState());
    expect(ids).toHaveLength(2);
    expect(ids).toEqual(["T-2001", "T-2002"]);
  });

  it("live pollSucceeded with duplicate newIds appends unique pending IDs only", () => {
    const store = makeStore();
    store.dispatch(
      pollSucceeded({
        serverTime: "2026-09-30T10:00:00Z",
        instanceId: "inst-1",
        newIds: ["T-3001", "T-3001", "T-3002"],
      })
    );

    expect(store.getState().live.pendingNewIds).toEqual(["T-3001", "T-3002"]);

    // Another poll with overlapping IDs
    store.dispatch(
      pollSucceeded({
        serverTime: "2026-09-30T10:00:05Z",
        instanceId: "inst-1",
        newIds: ["T-3002", "T-3003"],
      })
    );

    expect(store.getState().live.pendingNewIds).toEqual(["T-3001", "T-3002", "T-3003"]);
  });
});
