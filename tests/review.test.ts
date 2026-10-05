import { describe, it, expect } from "vitest";
import {
  getReviewQueue,
  isAcceptable,
  validateReviewChange,
  applyReview,
} from "@/lib/tickets/review";
import { normalizeTickets } from "@/lib/tickets/normalize";
import { TEST_TICKETS } from "@/data/test-tickets";
import type { Ticket } from "@/types/ticket";

function createTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "T-TEST",
    customerId: "C-1",
    plan: "pro",
    subject: "Test Ticket",
    body: "Test body",
    attachmentUrl: null,
    createdAt: "2026-09-20T10:00:00Z",
    status: "open",
    assignedTo: null,
    assignedToUnknown: null,
    category: "billing",
    priority: "P2",
    aiPriority: null,
    summary: "AI summary",
    triageDecision: "manual_review",
    reviewReason: "flagged_input",
    dataIssues: [],
    humanReview: null,
    version: 1,
    updatedAt: "2026-09-20T10:00:00Z",
    ...overrides,
  };
}

describe("lib/tickets/review", () => {
  const fixedNow = new Date("2026-09-29T12:00:00Z");
  const { tickets } = normalizeTickets(TEST_TICKETS, fixedNow);

  describe("getReviewQueue", () => {
    it("includes T-2003, T-2004, T-2006, and T-2012 from normalized test tickets", () => {
      const queue = getReviewQueue(tickets);
      const queueIds = queue.map((t) => t.id);

      expect(queueIds).toContain("T-2003");
      expect(queueIds).toContain("T-2004");
      expect(queueIds).toContain("T-2006");
      expect(queueIds).toContain("T-2012");
    });

    it("excludes auto_accept tickets (T-2001, T-2007) and already-handled tickets", () => {
      const handledTicket = createTicket({
        id: "T-HANDLED",
        triageDecision: "manual_review",
        humanReview: { action: "accepted", reviewedBy: "agent-1", note: null },
      });

      const queue = getReviewQueue([...tickets, handledTicket]);
      const queueIds = queue.map((t) => t.id);

      expect(queueIds).not.toContain("T-2001");
      expect(queueIds).not.toContain("T-2007");
      expect(queueIds).not.toContain("T-HANDLED");
    });

    it("excludes tickets that already have a manual priority set or finalPriority defined (e.g. T-10768)", () => {
      // Simulating T-10768: AI suggested P3, but manual/final priority is P1
      const manualPriorityTicket = createTicket({
        id: "T-10768",
        plan: "enterprise",
        priority: "P1",
        aiPriority: "P3",
        triageDecision: "manual_review",
      });

      const explicitFinalPriorityTicket = createTicket({
        id: "T-FINAL-P",
        priority: "P2",
        finalPriority: "P2",
        triageDecision: "manual_review",
      });

      const unhandledTicket = createTicket({
        id: "T-PENDING",
        priority: "P2",
        aiPriority: null,
        triageDecision: "manual_review",
      });

      const queue = getReviewQueue([manualPriorityTicket, explicitFinalPriorityTicket, unhandledTicket]);
      const queueIds = queue.map((t) => t.id);

      expect(queueIds).not.toContain("T-10768");
      expect(queueIds).not.toContain("T-FINAL-P");
      expect(queueIds).toContain("T-PENDING");
    });

    it("sorts by priority (P0 -> P3, invalid last), then oldest createdAt first, then id", () => {
      const tP3Old = createTicket({
        id: "T-P3-OLD",
        priority: "P3",
        createdAt: "2026-09-20T08:00:00Z",
      });
      const tP3New = createTicket({
        id: "T-P3-NEW",
        priority: "P3",
        createdAt: "2026-09-20T12:00:00Z",
      });
      const tP0 = createTicket({
        id: "T-P0",
        priority: "P0",
        createdAt: "2026-09-20T15:00:00Z",
      });
      const tNullPriority = createTicket({
        id: "T-NULL-P",
        priority: null,
        createdAt: "2026-09-20T06:00:00Z",
      });

      const queue = getReviewQueue([tP3New, tNullPriority, tP0, tP3Old]);
      const queueIds = queue.map((t) => t.id);

      // P0 comes first, then P3 (oldest first: tP3Old before tP3New), then null priority last
      expect(queueIds).toEqual(["T-P0", "T-P3-OLD", "T-P3-NEW", "T-NULL-P"]);
    });
  });

  describe("isAcceptable", () => {
    it("returns false for T-2004 (invalid category and priority)", () => {
      const t2004 = tickets.find((t) => t.id === "T-2004")!;
      expect(isAcceptable(t2004)).toBe(false);
    });

    it("returns true for tickets with valid category and priority", () => {
      const t2003 = tickets.find((t) => t.id === "T-2003")!;
      expect(isAcceptable(t2003)).toBe(true);
    });
  });

  describe("validateReviewChange", () => {
    const ticket = createTicket({
      plan: "pro",
      category: "billing",
      priority: "P2",
    });

    it("fails when reason is less than 10 trimmed characters", () => {
      const res = validateReviewChange(ticket, {
        category: "bug",
        priority: "P1",
        reason: "123456789", // 9 chars
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors.reason).toBe("Enter a reason of at least 10 characters.");
      }
    });

    it("passes when reason is exactly 10 trimmed characters", () => {
      const res = validateReviewChange(ticket, {
        category: "bug",
        priority: "P1",
        reason: "1234567890", // 10 chars
      });
      expect(res.ok).toBe(true);
    });

    it("whitespace padding does not count towards length requirement", () => {
      const res = validateReviewChange(ticket, {
        category: "bug",
        priority: "P1",
        reason: "   x   ", // trimmed length = 1
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors.reason).toBe("Enter a reason of at least 10 characters.");
      }
    });

    it("fails when reason is whitespace-only", () => {
      const res = validateReviewChange(ticket, {
        category: "bug",
        priority: "P1",
        reason: "              ",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors.reason).toBe("Enter a reason of at least 10 characters.");
      }
    });

    it("fails when reason exceeds 500 characters", () => {
      const res = validateReviewChange(ticket, {
        category: "bug",
        priority: "P1",
        reason: "a".repeat(501),
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors.reason).toBe("Reason cannot exceed 500 characters.");
      }
    });

    it("returns form error when neither category nor priority changed", () => {
      const res = validateReviewChange(ticket, {
        category: "billing", // same
        priority: "P2", // same
        reason: "A valid explanation that is long enough.",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors.form).toContain("Nothing changed.");
      }
    });

    it("passes for category-only change", () => {
      const res = validateReviewChange(ticket, {
        category: "bug",
        priority: "P2",
        reason: "Customer report indicates a software bug.",
      });
      expect(res.ok).toBe(true);
    });

    it("passes for priority-only change", () => {
      const res = validateReviewChange(ticket, {
        category: "billing",
        priority: "P1",
        reason: "High impact billing dispute.",
      });
      expect(res.ok).toBe(true);
    });

    it("passes when ticket had null AI values and valid values are selected", () => {
      const nullTicket = createTicket({
        category: null,
        priority: null,
      });
      const res = validateReviewChange(nullTicket, {
        category: "billing",
        priority: "P2",
        reason: "Assigned proper classification.",
      });
      expect(res.ok).toBe(true);
    });

    it("enforces enterprise priority floor: enterprise + P2 or P3 fails", () => {
      const entTicket = createTicket({
        plan: "enterprise",
        category: "billing",
        priority: "P1",
      });

      const resP2 = validateReviewChange(entTicket, {
        category: "bug",
        priority: "P2",
        reason: "Downgrading priority based on severity.",
      });
      expect(resP2.ok).toBe(false);
      if (!resP2.ok) {
        expect(resP2.errors.priority).toBe("Enterprise tickets must stay at P1 or higher.");
      }

      const resP3 = validateReviewChange(entTicket, {
        category: "bug",
        priority: "P3",
        reason: "Downgrading priority based on severity.",
      });
      expect(resP3.ok).toBe(false);
    });

    it("allows enterprise + P0 or P1", () => {
      const entTicket = createTicket({
        plan: "enterprise",
        category: "billing",
        priority: "P1",
      });

      const resP0 = validateReviewChange(entTicket, {
        category: "billing",
        priority: "P0",
        reason: "Critical outage affecting customer.",
      });
      expect(resP0.ok).toBe(true);
    });

    it("allows pro plan + P3", () => {
      const proTicket = createTicket({
        plan: "pro",
        category: "billing",
        priority: "P2",
      });
      const res = validateReviewChange(proTicket, {
        category: "billing",
        priority: "P3",
        reason: "Low priority inquiry.",
      });
      expect(res.ok).toBe(true);
    });

    it("does not block unknown plans from selecting P3", () => {
      const unknownPlanTicket = createTicket({
        plan: null,
        category: null,
        priority: null,
      });
      const res = validateReviewChange(unknownPlanTicket, {
        category: "billing",
        priority: "P3",
        reason: "Classified with reason.",
      });
      expect(res.ok).toBe(true);
    });
  });

  describe("applyReview", () => {
    it("accept keeps values on normal tickets and sets humanReview", () => {
      const ticket = createTicket({
        plan: "pro",
        category: "bug",
        priority: "P2",
      });

      const updated = applyReview(ticket, { type: "accept" }, "agent-1");

      expect(updated.category).toBe("bug");
      expect(updated.priority).toBe("P2");
      expect(updated.humanReview).toEqual({
        action: "accepted",
        reviewedBy: "agent-1",
        note: null,
      });
      expect(updated.triageDecision).toBe("manual_review"); // unchanged
      expect(updated).not.toBe(ticket); // immutable
    });

    it("accept on enterprise ticket with priority P3 applies floor -> P1 + aiPriority P3 + reviewReason rule_adjusted", () => {
      const entTicket = createTicket({
        plan: "enterprise",
        category: "account_access",
        priority: "P3",
        aiPriority: null,
        reviewReason: null,
      });

      const updated = applyReview(entTicket, { type: "accept" }, "agent-1");

      expect(updated.priority).toBe("P1");
      expect(updated.aiPriority).toBe("P3");
      expect(updated.reviewReason).toBe("rule_adjusted");
      expect(updated.humanReview?.action).toBe("accepted");
    });

    it("change sets category/priority, aiPriority = previous, note = trimmed reason", () => {
      const ticket = createTicket({
        category: "billing",
        priority: "P3",
        aiPriority: null,
      });

      const updated = applyReview(
        ticket,
        {
          type: "change",
          category: "bug",
          priority: "P1",
          reason: "   Investigated and confirmed critical bug.   ",
        },
        "agent-1"
      );

      expect(updated.category).toBe("bug");
      expect(updated.priority).toBe("P1");
      expect(updated.aiPriority).toBe("P3"); // set to previous priority
      expect(updated.humanReview).toEqual({
        action: "changed",
        reviewedBy: "agent-1",
        note: "Investigated and confirmed critical bug.",
      });
      expect(updated.triageDecision).toBe("manual_review");
    });
  });
});
