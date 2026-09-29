import { describe, it, expect } from "vitest";
import {
  getAllowedTransitions,
  canTransition,
  getStatusActionState,
} from "@/lib/tickets/transitions";
import type { Ticket } from "@/types/ticket";

function createTestTicket(overrides: Partial<Ticket> = {}): Ticket {
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
    summary: null,
    triageDecision: "auto_accept",
    reviewReason: null,
    dataIssues: [],
    ...overrides,
  };
}

describe("lib/tickets/transitions", () => {
  describe("getAllowedTransitions & canTransition", () => {
    it("allows valid moves: open -> in_progress", () => {
      expect(getAllowedTransitions("open")).toEqual(["in_progress"]);
      expect(canTransition("open", "in_progress")).toBe(true);
    });

    it("allows valid moves: in_progress -> resolved", () => {
      expect(getAllowedTransitions("in_progress")).toEqual(["resolved"]);
      expect(canTransition("in_progress", "resolved")).toBe(true);
    });

    it("allows valid moves: resolved -> open", () => {
      expect(getAllowedTransitions("resolved")).toEqual(["open"]);
      expect(canTransition("resolved", "open")).toBe(true);
    });

    it("rejects invalid moves: open -> resolved, open -> closed", () => {
      expect(canTransition("open", "resolved")).toBe(false);
      expect(canTransition("open", "closed")).toBe(false);
    });

    it("rejects invalid moves: in_progress -> open", () => {
      expect(canTransition("in_progress", "open")).toBe(false);
    });

    it("rejects invalid moves: resolved -> in_progress", () => {
      expect(canTransition("resolved", "in_progress")).toBe(false);
    });

    it("rejects any moves from closed", () => {
      expect(getAllowedTransitions("closed")).toEqual([]);
      expect(canTransition("closed", "open")).toBe(false);
      expect(canTransition("closed", "in_progress")).toBe(false);
      expect(canTransition("closed", "resolved")).toBe(false);
    });

    it("rejects any moves when status is null or invalid", () => {
      expect(getAllowedTransitions(null)).toEqual([]);
      expect(canTransition(null, "open")).toBe(false);
      expect(canTransition(null, "in_progress")).toBe(false);
    });
  });

  describe("getStatusActionState reasons", () => {
    const currentAgent = "agent-1"; // Priya

    it("returns 'Claim this ticket first' when moving open ticket to in_progress without assignee", () => {
      const ticket = createTestTicket({ status: "open", assignedTo: null });
      const actions = getStatusActionState(ticket, currentAgent);

      expect(actions).toHaveLength(1);
      expect(actions[0].targetStatus).toBe("in_progress");
      expect(actions[0].enabled).toBe(false);
      expect(actions[0].reason).toBe("Claim this ticket first");
    });

    it("enables 'Start progress' when open ticket is assigned to current agent", () => {
      const ticket = createTestTicket({ status: "open", assignedTo: currentAgent });
      const actions = getStatusActionState(ticket, currentAgent);

      expect(actions).toHaveLength(1);
      expect(actions[0].targetStatus).toBe("in_progress");
      expect(actions[0].enabled).toBe(true);
      expect(actions[0].reason).toBeUndefined();
    });

    it("returns 'Assigned to Rahul' when ticket is assigned to another agent (agent-2)", () => {
      const ticket = createTestTicket({
        status: "in_progress",
        assignedTo: "agent-2",
      });
      const actions = getStatusActionState(ticket, currentAgent);

      expect(actions).toHaveLength(1);
      expect(actions[0].enabled).toBe(false);
      expect(actions[0].reason).toBe("Assigned to Rahul");
    });

    it("returns 'Assigned to an unknown agent' when assigned to agent-99 or unknown", () => {
      const ticket = createTestTicket({
        status: "in_progress",
        assignedTo: "agent-99",
        assignedToUnknown: "agent-99",
      });
      const actions = getStatusActionState(ticket, currentAgent);

      expect(actions).toHaveLength(1);
      expect(actions[0].enabled).toBe(false);
      expect(actions[0].reason).toBe("Assigned to an unknown agent");
    });

    it("returns 'Closed tickets can't be changed' when ticket is closed", () => {
      const ticket = createTestTicket({ status: "closed", assignedTo: currentAgent });
      const actions = getStatusActionState(ticket, currentAgent);

      expect(actions).toHaveLength(0);
      expect(actions.reason).toBe("Closed tickets can't be changed");
    });
  });
});
