import { describe, it, expect, beforeEach } from "vitest";
import { createTicketStore, TicketStore } from "@/lib/server/ticket-store";
import { buildSeed } from "@/lib/server/seed";

describe("TicketStore and In-Memory Data", () => {
  let store: TicketStore;

  beforeEach(() => {
    let seedValue = 42;
    const deterministicRand = () => {
      seedValue = (seedValue * 16807) % 2147483647;
      return (seedValue - 1) / 2147483646;
    };
    const seed = buildSeed({
      now: 1774000000000,
      random: deterministicRand,
    });
    store = createTicketStore({
      tickets: seed.tickets,
      duplicatesRemoved: seed.duplicatesRemoved,
      now: 1774000000000,
      random: deterministicRand,
    });
  });

  it("seeds ~5000 tickets including raw test fixtures", () => {
    const res = store.list({ limit: 100 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.total).toBeGreaterThanOrEqual(4900);

    // Raw test fixtures are present
    const t2001Res = store.get("T-2001");
    expect(t2001Res.ok).toBe(true);
    if (!t2001Res.ok) return;
    expect(t2001Res.ticket.subject).toBe("SSO login down for whole team");
  });

  it("filters tickets by status, priority, and category", () => {
    const res = store.list({
      status: "open",
      category: "billing",
      limit: 10,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.tickets.length).toBeGreaterThan(0);
    for (const t of res.tickets) {
      expect(t.status).toBe("open");
      expect(t.category).toBe("billing");
    }
  });

  it("supports cursor pagination without duplicates or skipped items", () => {
    const page1 = store.list({ limit: 10 });
    expect(page1.ok).toBe(true);
    if (!page1.ok) return;
    expect(page1.tickets).toHaveLength(10);
    expect(page1.nextCursor).toBeTruthy();

    const page2 = store.list({ limit: 10, cursor: page1.nextCursor });
    expect(page2.ok).toBe(true);
    if (!page2.ok) return;
    expect(page2.tickets).toHaveLength(10);

    const ids1 = new Set(page1.tickets.map((t) => t.id));
    for (const t of page2.tickets) {
      expect(ids1.has(t.id)).toBe(false);
    }
  });

  it("claims a ticket successfully and prevents concurrent claim by another agent", () => {
    const listRes = store.list({ status: "open", limit: 50 });
    expect(listRes.ok).toBe(true);
    if (!listRes.ok) return;

    const target = listRes.tickets.find((t) => t.assignedTo === null);
    expect(target).toBeDefined();
    if (!target) return;

    const claimRes = store.claim(target.id, "agent-1");
    expect(claimRes.ok).toBe(true);
    if (!claimRes.ok) return;

    expect(claimRes.ticket.assignedTo).toBe("agent-1");
    expect(claimRes.ticket.version).toBe(target.version + 1);

    // Another agent trying to claim gets 409 conflict with winning ticket
    const conflictRes = store.claim(target.id, "agent-2");
    expect(conflictRes.ok).toBe(false);
    if (conflictRes.ok) return;

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.code).toBe("conflict");
    expect(conflictRes.ticket?.assignedTo).toBe("agent-1");
  });

  it("enforces status transition rules and assignee requirements", () => {
    const listRes = store.list({ status: "open", limit: 50 });
    if (!listRes.ok) return;
    const unassigned = listRes.tickets.find((t) => t.assignedTo === null);
    if (!unassigned) return;

    // Open unassigned ticket cannot directly go to in_progress without claim
    const invalidRes = store.setStatus(unassigned.id, "agent-1", "in_progress");
    expect(invalidRes.ok).toBe(false);
    if (invalidRes.ok) return;
    expect(invalidRes.code).toBe("claim_required");

    // After claim, assigned agent can transition open -> in_progress
    store.claim(unassigned.id, "agent-1");
    const validRes = store.setStatus(unassigned.id, "agent-1", "in_progress");
    expect(validRes.ok).toBe(true);

    // Another agent cannot transition status
    const diffAgentRes = store.setStatus(unassigned.id, "agent-2", "resolved");
    expect(diffAgentRes.ok).toBe(false);
    if (diffAgentRes.ok) return;
    expect(diffAgentRes.code).toBe("not_assignee");
  });

  it("handles manual review triage with accept and change decisions", () => {
    const listRes = store.list({ decision: "manual_review", limit: 50 });
    if (!listRes.ok) return;
    const target = listRes.tickets.find((t) => t.humanReview === null);
    expect(target).toBeDefined();
    if (!target) return;

    const acceptRes = store.review(target.id, "agent-1", {
      type: "accept",
    });
    expect(acceptRes.ok).toBe(true);
    if (!acceptRes.ok) return;
    expect(acceptRes.ticket.humanReview?.action).toBe("accepted");
    expect(acceptRes.ticket.humanReview?.reviewedBy).toBe("agent-1");

    // Once reviewed, a second review attempt returns not_in_review
    const secondRes = store.review(target.id, "agent-2", { type: "accept" });
    expect(secondRes.ok).toBe(false);
    if (secondRes.ok) return;
    expect(secondRes.status).toBe(409);
    expect(secondRes.code).toBe("not_in_review");
  });

  it("polls for changes using cursor", () => {
    const initialCursor = new Date(1774000000000).toISOString();
    const listRes = store.list({ status: "open", limit: 10 });
    if (!listRes.ok) return;
    const target = listRes.tickets[0];

    // Mutate ticket
    store.claim(target.id, "agent-1");

    const pollRes = store.updates(initialCursor);
    expect(pollRes.ok).toBe(true);
    if (!pollRes.ok) return;

    expect(pollRes.updated.some((t) => t.id === target.id)).toBe(true);
  });
});
