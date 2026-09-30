import { describe, it, expect, beforeEach } from "vitest";
import { TEST_TICKETS } from "@/data/test-tickets";
import { normalizeTickets, normalizeTicket } from "@/lib/tickets/normalize";
import { createTicketStore, TicketStore } from "@/lib/server/ticket-store";
import { buildSeed } from "@/lib/server/seed";
import { GET as getTicketHandler } from "@/app/api/tickets/[id]/route";

describe("Test-Ticket Audit Matrix (Phase 10)", () => {
  const fixedNow = new Date("2026-09-30T10:00:00Z");
  let store: TicketStore;

  beforeEach(() => {
    process.env.FAKE_API_CHAOS = "off";
    let seedVal = 12345;
    const deterministicRand = () => {
      seedVal = (seedVal * 16807) % 2147483647;
      return (seedVal - 1) / 2147483646;
    };
    const seed = buildSeed({
      now: fixedNow.getTime(),
      random: deterministicRand,
    });
    store = createTicketStore({
      tickets: seed.tickets,
      duplicatesRemoved: seed.duplicatesRemoved,
      now: fixedNow.getTime(),
      random: deterministicRand,
    });
    globalThis.__ticketStore__ = store;
  });

  it("T-2001 (+ duplicate): deduplicated into exactly one ticket with duplicatesRemoved = 1", () => {
    const { tickets, duplicatesRemoved } = normalizeTickets(TEST_TICKETS, fixedNow);
    const t2001s = tickets.filter((t) => t.id === "T-2001");
    expect(t2001s).toHaveLength(1);
    expect(duplicatesRemoved).toBe(1);

    const t = t2001s[0];
    expect(t.plan).toBe("enterprise");
    expect(t.priority).toBe("P0");
    expect(t.status).toBe("open");
    expect(t.assignedTo).toBeNull();
    expect(t.triageDecision).toBe("auto_accept");
  });

  it("T-2002: HTML tags in subject/body are preserved as plain literal text", () => {
    const raw = TEST_TICKETS.find((t) => t.external_id === "T-2002")!;
    const t = normalizeTicket(raw, fixedNow);
    expect(t.subject).toBe("<b>Refund</b> needed");
    expect(t.body).toContain("<img src=x onerror=\"alert('hacked')\">");
    expect(t.body).toContain("<a href=\"https://example.com/invoice\">");
  });

  it("T-2003: javascript: attachment is stripped to null and flagged unsafe_attachment_url", () => {
    const raw = TEST_TICKETS.find((t) => t.external_id === "T-2003")!;
    const t = normalizeTicket(raw, fixedNow);
    expect(t.attachmentUrl).toBeNull();
    expect(t.dataIssues).toContain("unsafe_attachment_url");
    expect(t.reviewReason).toBe("flagged_input");
    expect(t.triageDecision).toBe("manual_review");
    expect(t.priority).toBe("P3");
  });

  it("T-2004: invalid plan, category, priority normalized to null with data issues", () => {
    const raw = TEST_TICKETS.find((t) => t.external_id === "T-2004")!;
    const t = normalizeTicket(raw, fixedNow);
    expect(t.plan).toBeNull();
    expect(t.category).toBeNull();
    expect(t.priority).toBeNull();
    expect(t.summary).toBeNull();
    expect(t.dataIssues).toContain("invalid_plan");
    expect(t.dataIssues).toContain("invalid_category");
    expect(t.dataIssues).toContain("invalid_priority");
  });

  it("T-2005: long unbroken subject preserved without crashing and assigned to agent-2", () => {
    const raw = TEST_TICKETS.find((t) => t.external_id === "T-2005")!;
    const t = normalizeTicket(raw, fixedNow);
    expect(t.subject).toContain("ACCESS_DENIED_while_syncing");
    expect(t.assignedTo).toBe("agent-2");
    expect(t.status).toBe("in_progress");
  });

  it("T-2006: empty subject and null body flagged empty_subject and empty_body", () => {
    const raw = TEST_TICKETS.find((t) => t.external_id === "T-2006")!;
    const t = normalizeTicket(raw, fixedNow);
    expect(t.subject).toBe("");
    expect(t.body).toBeNull();
    expect(t.dataIssues).toContain("empty_subject");
    expect(t.dataIssues).toContain("empty_body");
    expect(t.reviewReason).toBe("empty_ticket");
  });

  it("T-2007: naive timestamp assumed UTC and flagged assumed_utc, enterprise floor preserved", () => {
    const raw = TEST_TICKETS.find((t) => t.external_id === "T-2007")!;
    const t = normalizeTicket(raw, fixedNow);
    expect(t.dataIssues).toContain("assumed_utc");
    expect(t.createdAt).toBe("2026-09-20T11:30:00.000Z");
    expect(t.priority).toBe("P1");
    expect(t.aiPriority).toBe("P3");
    expect(t.reviewReason).toBe("rule_adjusted");
  });

  it("T-2008: future created_at flagged future_created_at", () => {
    const raw = TEST_TICKETS.find((t) => t.external_id === "T-2008")!;
    const t = normalizeTicket(raw, fixedNow);
    expect(t.dataIssues).toContain("future_created_at");
  });

  it("T-2009: offset timestamp converted to UTC instant and invalid agent tracked safely", () => {
    const raw = TEST_TICKETS.find((t) => t.external_id === "T-2009")!;
    const t = normalizeTicket(raw, fixedNow);
    expect(t.createdAt).toBe("2026-09-21T03:15:00.000Z");
    expect(t.assignedTo).toBeNull();
    expect(t.assignedToUnknown).toBe("agent-99");
    expect(t.dataIssues).toContain("invalid_agent");
  });

  it("T-2010: terminal closed status and safe https attachment", () => {
    const raw = TEST_TICKETS.find((t) => t.external_id === "T-2010")!;
    const t = normalizeTicket(raw, fixedNow);
    expect(t.status).toBe("closed");
    expect(t.attachmentUrl).toBe("https://files.example.com/screenshots/export-bug.png");
  });

  it("T-2011: summary with hostile HTML rendered as plain text", () => {
    const raw = TEST_TICKETS.find((t) => t.external_id === "T-2011")!;
    const t = normalizeTicket(raw, fixedNow);
    expect(t.summary).toContain("<img src=x onerror=\"alert('summary')\">");
  });

  it("T-2012: missing review_reason key and invalid triage decision fails safe to manual_review", () => {
    const raw = TEST_TICKETS.find((t) => t.external_id === "T-2012")!;
    const t = normalizeTicket(raw, fixedNow);
    expect(t.triageDecision).toBe("manual_review");
    expect(t.reviewReason).toBeNull();
    expect(t.dataIssues).toContain("invalid_triage_decision");
  });

  it("API returns every test ticket via GET /api/tickets/[id]", async () => {
    for (let i = 1; i <= 12; i++) {
      const id = `T-${2000 + i}`;
      const req = new Request(`http://localhost/api/tickets/${id}`);
      const res = await getTicketHandler(req, { params: Promise.resolve({ id }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ticket.id).toBe(id);
    }
  });
});
