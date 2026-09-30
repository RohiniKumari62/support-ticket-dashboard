import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST as retriageHandler } from "@/app/api/tickets/[id]/retriage/route";
import * as triageServiceModule from "@/lib/server/triage-service";
import { createTicketStore } from "@/lib/server/ticket-store";
import { buildSeed } from "@/lib/server/seed";

describe("Retriage Security Tests (Phase 10)", () => {
  beforeEach(() => {
    process.env.FAKE_API_CHAOS = "off";
    process.env.TRIAGE_API_KEY = "test-secret-key-12345";
    let seedVal = 99999;
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

  it("empty ticket T-2006 returns 422 unprocessable and does NOT call triage service", async () => {
    const spy = vi.spyOn(triageServiceModule, "runTriageService");
    const ctx = { params: Promise.resolve({ id: "T-2006" }) };
    const req = new Request("http://localhost/api/tickets/T-2006/retriage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "agent-1" }),
    });

    const res = await retriageHandler(req, ctx);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe("unprocessable");
    expect(json.error.message).toBe("There isn't enough content to analyse.");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("missing TRIAGE_API_KEY returns 503 triage_not_configured", async () => {
    delete process.env.TRIAGE_API_KEY;
    const ctx = { params: Promise.resolve({ id: "T-2001" }) };
    const req = new Request("http://localhost/api/tickets/T-2001/retriage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "agent-1" }),
    });

    const res = await retriageHandler(req, ctx);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error.code).toBe("triage_not_configured");
  });

  it("T-2003 prompt injection never changes priority or raises it to P0", async () => {
    // Mock triage service to return deterministic output — priority from ticket (P3), never P0
    const spy = vi.spyOn(triageServiceModule, "runTriageService").mockResolvedValue({
      category: "bug",
      priority: "P3",
      summary: "Customer reports an error shown in an attachment.",
    });

    const ctx = { params: Promise.resolve({ id: "T-2003" }) };
    const req = new Request("http://localhost/api/tickets/T-2003/retriage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "agent-1" }),
    });

    const res = await retriageHandler(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ticket.priority).not.toBe("P0");
    expect(json.ticket.priority).toBe("P3");
    spy.mockRestore();
  });

  it("T-2007 enterprise floor and aiPriority are preserved upon retriage", async () => {
    // T-2007: enterprise plan, ai_priority P3 → enterprise floor raises to P1
    const spy = vi.spyOn(triageServiceModule, "runTriageService").mockResolvedValue({
      category: "account_access",
      priority: "P3",
      summary: "Customer's password has not worked since yesterday.",
    });

    const ctx = { params: Promise.resolve({ id: "T-2007" }) };
    const req = new Request("http://localhost/api/tickets/T-2007/retriage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "agent-1" }),
    });

    const res = await retriageHandler(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ticket.priority).toBe("P1");
    spy.mockRestore();
  });

  it("human-reviewed ticket returns 409 already_reviewed", async () => {
    const store = globalThis.__ticketStore__!;
    store.review("T-2003", "agent-1", { type: "accept" });

    const ctx = { params: Promise.resolve({ id: "T-2003" }) };
    const req = new Request("http://localhost/api/tickets/T-2003/retriage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "agent-1" }),
    });

    const res = await retriageHandler(req, ctx);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("already_reviewed");
  });

  it("closed ticket T-2010 returns 409 invalid_transition", async () => {
    const ctx = { params: Promise.resolve({ id: "T-2010" }) };
    const req = new Request("http://localhost/api/tickets/T-2010/retriage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "agent-1" }),
    });

    const res = await retriageHandler(req, ctx);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("invalid_transition");
  });

  it("response body and error body never echo the secret TRIAGE_API_KEY", async () => {
    const secret = "test-secret-key-12345";
    // Mock to always return valid output — whether it's 200 or 502 we just check the body
    const spy = vi.spyOn(triageServiceModule, "runTriageService").mockResolvedValue({
      category: "bug",
      priority: "P2",
      summary: "Test triage output.",
    });

    const ctx = { params: Promise.resolve({ id: "T-2001" }) };
    const req = new Request("http://localhost/api/tickets/T-2001/retriage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "agent-1" }),
    });

    const res = await retriageHandler(req, ctx);
    const text = await res.text();
    expect(text).not.toContain(secret);
    spy.mockRestore();
  });
});
