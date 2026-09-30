import { describe, it, expect, beforeEach } from "vitest";
import { POST as claimHandler } from "@/app/api/tickets/[id]/claim/route";
import { PATCH as statusHandler } from "@/app/api/tickets/[id]/status/route";
import { PATCH as triageHandler } from "@/app/api/tickets/[id]/triage/route";
import { GET as getTicketHandler } from "@/app/api/tickets/[id]/route";
import { createTicketStore } from "@/lib/server/ticket-store";
import { buildSeed } from "@/lib/server/seed";

describe("API Validation Matrix (Phase 10)", () => {
  beforeEach(() => {
    process.env.FAKE_API_CHAOS = "off";
    let seedVal = 54321;
    const rand = () => {
      seedVal = (seedVal * 16807) % 2147483647;
      return (seedVal - 1) / 2147483646;
    };
    const seed = buildSeed({ now: 1774000000000, random: rand });
    globalThis.__ticketStore__ = createTicketStore({
      tickets: seed.tickets,
      duplicatesRemoved: seed.duplicatesRemoved,
      now: 1774000000000,
      random: rand,
    });
  });

  it("rejects malformed ticket IDs with 400", async () => {
    const dangerousIds = ["__proto__", "constructor", "prototype", "id/with/slash", "a".repeat(70)];
    for (const id of dangerousIds) {
      const req = new Request(`http://localhost/api/tickets/${id}`);
      const res = await getTicketHandler(req, { params: Promise.resolve({ id }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("invalid_request");
    }
  });

  it("returns 404 for non-existent tickets across routes", async () => {
    const unknownId = "T-99999";
    const ctx = { params: Promise.resolve({ id: unknownId }) };

    // GET
    const getRes = await getTicketHandler(
      new Request(`http://localhost/api/tickets/${unknownId}`),
      ctx
    );
    expect(getRes.status).toBe(404);

    // Claim
    const claimRes = await claimHandler(
      new Request(`http://localhost/api/tickets/${unknownId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "agent-1" }),
      }),
      ctx
    );
    expect(claimRes.status).toBe(404);

    // Status
    const statusRes = await statusHandler(
      new Request(`http://localhost/api/tickets/${unknownId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "agent-1", status: "in_progress" }),
      }),
      ctx
    );
    expect(statusRes.status).toBe(404);
  });

  it("rejects non-application/json with 415", async () => {
    const req = new Request("http://localhost/api/tickets/T-2001/claim", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "agentId=agent-1",
    });
    const res = await claimHandler(req, { params: Promise.resolve({ id: "T-2001" }) });
    expect(res.status).toBe(415);
  });

  it("rejects oversized request bodies with 413", async () => {
    const giantPayload = JSON.stringify({
      agentId: "agent-1",
      extra: "x".repeat(12000),
    });
    const req = new Request("http://localhost/api/tickets/T-2001/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: giantPayload,
    });
    const res = await claimHandler(req, { params: Promise.resolve({ id: "T-2001" }) });
    expect(res.status).toBe(413);
  });

  it("rejects invalid agents (e.g. agent-99 or non-string) with 400", async () => {
    const invalidAgents = ["agent-99", "admin", "", 123, null];
    for (const agentId of invalidAgents) {
      const req = new Request("http://localhost/api/tickets/T-2001/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const res = await claimHandler(req, { params: Promise.resolve({ id: "T-2001" }) });
      expect(res.status).toBe(400);
    }
  });

  it("enforces status transition and non-assignee 403 on T-2005", async () => {
    // T-2005 is assigned to agent-2 (Rahul)
    const ctx = { params: Promise.resolve({ id: "T-2005" }) };

    // agent-1 (Priya) tries to resolve T-2005 -> 403 not_assignee
    const forbiddenRes = await statusHandler(
      new Request("http://localhost/api/tickets/T-2005/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "agent-1", status: "resolved" }),
      }),
      ctx
    );
    expect(forbiddenRes.status).toBe(403);
    const json = await forbiddenRes.json();
    expect(json.error.code).toBe("not_assignee");

    // agent-2 (Rahul) can resolve T-2005
    const successRes = await statusHandler(
      new Request("http://localhost/api/tickets/T-2005/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "agent-2", status: "resolved" }),
      }),
      ctx
    );
    expect(successRes.status).toBe(200);
  });

  it("T-2009 (unknown agent) rejects status change and claim", async () => {
    const ctx = { params: Promise.resolve({ id: "T-2009" }) };

    // Priya cannot update status
    const statusRes = await statusHandler(
      new Request("http://localhost/api/tickets/T-2009/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "agent-1", status: "resolved" }),
      }),
      ctx
    );
    expect(statusRes.status).toBe(403);

    // Priya cannot claim because it is already assigned to unknown agent
    const claimRes = await claimHandler(
      new Request("http://localhost/api/tickets/T-2009/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "agent-1" }),
      }),
      ctx
    );
    expect(claimRes.status).toBe(409);
  });

  it("closed ticket T-2010 rejects claim and status transitions", async () => {
    const ctx = { params: Promise.resolve({ id: "T-2010" }) };

    const claimRes = await claimHandler(
      new Request("http://localhost/api/tickets/T-2010/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "agent-1" }),
      }),
      ctx
    );
    expect(claimRes.status).toBe(409);

    const statusRes = await statusHandler(
      new Request("http://localhost/api/tickets/T-2010/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "agent-1", status: "open" }),
      }),
      ctx
    );
    expect(statusRes.status).toBe(409);
  });

  it("validates triage decision input bounds and rejects invalid reasons", async () => {
    const ctx = { params: Promise.resolve({ id: "T-2003" }) };

    // Invalid decision "maybe"
    const badDecisionRes = await triageHandler(
      new Request("http://localhost/api/tickets/T-2003/triage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "agent-1", decision: "maybe" }),
      }),
      ctx
    );
    expect(badDecisionRes.status).toBe(400);

    // Short reason < 10 chars
    const shortReasonRes = await triageHandler(
      new Request("http://localhost/api/tickets/T-2003/triage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "agent-1",
          decision: "change",
          priority: "P2",
          reason: "Too short",
        }),
      }),
      ctx
    );
    expect(shortReasonRes.status).toBe(400);

    // Oversized reason > 500 chars
    const longReasonRes = await triageHandler(
      new Request("http://localhost/api/tickets/T-2003/triage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "agent-1",
          decision: "change",
          priority: "P2",
          reason: "r".repeat(501),
        }),
      }),
      ctx
    );
    expect(longReasonRes.status).toBe(400);
  });

  it("T-2004 accept is rejected with 422 because of invalid AI values", async () => {
    const ctx = { params: Promise.resolve({ id: "T-2004" }) };
    const res = await triageHandler(
      new Request("http://localhost/api/tickets/T-2004/triage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "agent-1", decision: "accept" }),
      }),
      ctx
    );
    expect(res.status).toBe(422);
  });

  it("prototype pollution body keys do not pollute Object.prototype", async () => {
    const ctx = { params: Promise.resolve({ id: "T-2001" }) };
    const req = new Request("http://localhost/api/tickets/T-2001/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"agentId":"agent-1","__proto__":{"polluted":"yes"}}',
    });
    await claimHandler(req, ctx);
    expect((Object.prototype as unknown as { polluted?: string }).polluted).toBeUndefined();
  });
});
