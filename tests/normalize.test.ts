import { describe, it, expect } from "vitest";
import { normalizeTicket, normalizeTickets } from "@/lib/tickets/normalize";
import { TEST_TICKETS } from "@/data/test-tickets";

describe("normalizeTickets and normalizeTicket", () => {
  const fixedNow = new Date("2026-09-29T12:00:00Z");

  it("deduplicates T-2001, keeps first occurrence, reports duplicatesRemoved = 1", () => {
    const { tickets, duplicatesRemoved } = normalizeTickets(
      TEST_TICKETS,
      fixedNow
    );
    expect(duplicatesRemoved).toBe(1);
    const t2001Tickets = tickets.filter((t) => t.id === "T-2001");
    expect(t2001Tickets).toHaveLength(1);
    expect(t2001Tickets[0].subject).toBe("SSO login down for whole team");
  });

  it("normalizes T-2004 with invalid plan, category, and priority as null with matching issues", () => {
    const rawT2004 = TEST_TICKETS.find((t) => t.external_id === "T-2004")!;
    const ticket = normalizeTicket(rawT2004, fixedNow);

    expect(ticket.plan).toBeNull();
    expect(ticket.category).toBeNull();
    expect(ticket.priority).toBeNull();
    expect(ticket.dataIssues).toContain("invalid_plan");
    expect(ticket.dataIssues).toContain("invalid_category");
    expect(ticket.dataIssues).toContain("invalid_priority");
  });

  it("normalizes T-2006 with empty subject and null body without crashing", () => {
    const rawT2006 = TEST_TICKETS.find((t) => t.external_id === "T-2006")!;
    const ticket = normalizeTicket(rawT2006, fixedNow);

    expect(ticket.subject).toBe("");
    expect(ticket.body).toBeNull();
    expect(ticket.dataIssues).toContain("empty_subject");
    expect(ticket.dataIssues).toContain("empty_body");
  });

  it("normalizes T-2007 assuming UTC for timezone-less timestamp and preserves ai_priority", () => {
    const rawT2007 = TEST_TICKETS.find((t) => t.external_id === "T-2007")!;
    const ticket = normalizeTicket(rawT2007, fixedNow);

    expect(ticket.createdAt).toBe("2026-09-20T11:30:00.000Z");
    expect(ticket.dataIssues).toContain("assumed_utc");
    expect(ticket.priority).toBe("P1");
    expect(ticket.aiPriority).toBe("P3");
  });

  it("normalizes T-2009 with +05:30 offset converting to UTC instant and flags agent-99 as unknown", () => {
    const rawT2009 = TEST_TICKETS.find((t) => t.external_id === "T-2009")!;
    const ticket = normalizeTicket(rawT2009, fixedNow);

    // 08:45 in +05:30 converts to 03:15 UTC on 2026-09-21
    expect(ticket.createdAt).toBe("2026-09-21T03:15:00.000Z");
    expect(ticket.assignedTo).toBeNull();
    expect(ticket.assignedToUnknown).toBe("agent-99");
    expect(ticket.dataIssues).toContain("invalid_agent");
  });

  it("flags T-2008 as future_created_at when created_at is after fixed now", () => {
    const rawT2008 = TEST_TICKETS.find((t) => t.external_id === "T-2008")!;
    const ticket = normalizeTicket(rawT2008, fixedNow);

    expect(ticket.createdAt).toBe("2027-01-01T00:00:00.000Z");
    expect(ticket.dataIssues).toContain("future_created_at");
  });

  it("normalizes T-2003 with javascript: attachment as null + unsafe_attachment_url issue", () => {
    const rawT2003 = TEST_TICKETS.find((t) => t.external_id === "T-2003")!;
    const ticket = normalizeTicket(rawT2003, fixedNow);

    expect(ticket.attachmentUrl).toBeNull();
    expect(ticket.dataIssues).toContain("unsafe_attachment_url");
  });

  it("normalizes T-2012 with triage 'maybe' failing safe to manual_review + invalid_triage_decision", () => {
    const rawT2012 = TEST_TICKETS.find((t) => t.external_id === "T-2012")!;
    const ticket = normalizeTicket(rawT2012, fixedNow);

    expect(ticket.triageDecision).toBe("manual_review");
    expect(ticket.dataIssues).toContain("invalid_triage_decision");
    expect(ticket.reviewReason).toBeNull();
  });

  it("accepts 'closed' status for T-2010 as valid terminal status", () => {
    const rawT2010 = TEST_TICKETS.find((t) => t.external_id === "T-2010")!;
    const ticket = normalizeTicket(rawT2010, fixedNow);

    expect(ticket.status).toBe("closed");
    expect(ticket.dataIssues).not.toContain("invalid_status");
  });
});
