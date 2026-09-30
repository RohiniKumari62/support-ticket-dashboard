import { describe, it, expect, beforeEach } from "vitest";
import {
  parseTicket,
  parseTicketsArray,
  getDroppedTicketCount,
  resetDroppedTicketCount,
} from "@/lib/api/parse-ticket";
import { makeStore } from "@/lib/store/store";
import { ticketReceivedFromServer } from "@/lib/store/tickets-slice";
import type { Ticket } from "@/types/ticket";

const validSample: Ticket = {
  id: "T-100",
  customerId: "C-1",
  plan: "pro",
  subject: "Valid subject",
  body: "Valid body",
  attachmentUrl: "https://example.com/screenshot.png",
  createdAt: "2026-09-20T10:00:00Z",
  status: "open",
  assignedTo: "agent-1",
  assignedToUnknown: null,
  category: "billing",
  priority: "P1",
  aiPriority: null,
  summary: "Valid summary",
  triageDecision: "manual_review",
  reviewReason: null,
  dataIssues: [],
  humanReview: null,
  version: 1,
  updatedAt: "2026-09-20T10:00:00Z",
};

describe("Client API parseTicket guard", () => {
  beforeEach(() => {
    resetDroppedTicketCount();
  });

  it("accepts a fully valid ticket", () => {
    const res = parseTicket(validSample);
    expect(res).not.toBeNull();
    expect(res?.id).toBe("T-100");
    expect(res?.priority).toBe("P1");
  });

  it("rejects prototype pollution and dangerous IDs", () => {
    expect(parseTicket({ ...validSample, id: "__proto__" })).toBeNull();
    expect(parseTicket({ ...validSample, id: "constructor" })).toBeNull();
    expect(parseTicket({ ...validSample, id: "prototype" })).toBeNull();
    expect(parseTicket({ ...validSample, id: "a/b" })).toBeNull();
    expect(parseTicket({ ...validSample, id: "a".repeat(65) })).toBeNull();
    expect(getDroppedTicketCount()).toBe(5);
  });

  it("rejects non-integer, negative, or zero versions", () => {
    expect(parseTicket({ ...validSample, version: 0 })).toBeNull();
    expect(parseTicket({ ...validSample, version: -1 })).toBeNull();
    expect(parseTicket({ ...validSample, version: 1.5 })).toBeNull();
    expect(parseTicket({ ...validSample, version: "1" })).toBeNull();
  });

  it("rejects invalid enums and invalid dates", () => {
    expect(parseTicket({ ...validSample, status: "flying" })).toBeNull();
    expect(parseTicket({ ...validSample, priority: "P99" })).toBeNull();
    expect(parseTicket({ ...validSample, category: "secret" })).toBeNull();
    expect(parseTicket({ ...validSample, plan: "platinum" })).toBeNull();
    expect(parseTicket({ ...validSample, assignedTo: "agent-99" })).toBeNull();
    expect(parseTicket({ ...validSample, updatedAt: "not-a-date" })).toBeNull();
    expect(parseTicket({ ...validSample, createdAt: "bad-date" })).toBeNull();
  });

  it("rejects oversized string payloads to prevent UI freeze", () => {
    const giantBody = "x".repeat(25000);
    expect(parseTicket({ ...validSample, body: giantBody })).toBeNull();

    const giantSubject = "s".repeat(2500);
    expect(parseTicket({ ...validSample, subject: giantSubject })).toBeNull();

    const giantSummary = "m".repeat(2500);
    expect(parseTicket({ ...validSample, summary: giantSummary })).toBeNull();
  });

  it("re-checks attachmentUrl with getSafeUrl and neutralizes unsafe schemes", () => {
    const unsafe = parseTicket({
      ...validSample,
      attachmentUrl: "javascript:alert(1)",
    });
    expect(unsafe).not.toBeNull();
    expect(unsafe?.attachmentUrl).toBeNull();
  });

  it("parseTicketsArray drops invalid tickets and preserves valid ones", () => {
    const mixed = [
      validSample,
      { ...validSample, id: "__proto__" },
      { ...validSample, id: "T-101", status: "invalid_status" },
      { ...validSample, id: "T-102" },
    ];

    const { valid, droppedCount } = parseTicketsArray(mixed);
    expect(valid).toHaveLength(2);
    expect(valid.map((t) => t.id)).toEqual(["T-100", "T-102"]);
    expect(droppedCount).toBe(2);
  });

  it("Redux state never receives or retains prototype pollution keys", () => {
    const store = makeStore();
    const malicious = { ...validSample, id: "__proto__" };

    expect(
      Object.prototype.hasOwnProperty.call(store.getState().tickets.byId, "__proto__")
    ).toBe(false);
    expect(store.getState().tickets.ids).not.toContain("__proto__");

    store.dispatch(ticketReceivedFromServer(malicious as unknown as Ticket));
    expect(store.getState().tickets.ids).not.toContain("__proto__");
  });
});
