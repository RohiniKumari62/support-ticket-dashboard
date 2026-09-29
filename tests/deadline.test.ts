import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  getDeadlineInfo,
  PRIORITY_HOURS,
} from "@/lib/tickets/deadline";
import type { Ticket } from "@/types/ticket";

function makeTicket(overrides?: Partial<Ticket>): Ticket {
  return {
    id: "T-TEST",
    customerId: "cust-1",
    plan: "pro",
    subject: "Test Ticket",
    body: "Body",
    attachmentUrl: null,
    createdAt: "2026-09-20T10:00:00.000Z",
    status: "open",
    assignedTo: "agent-1",
    assignedToUnknown: null,
    category: "billing",
    priority: "P1",
    aiPriority: "P1",
    summary: "Summary",
    triageDecision: "manual_review",
    reviewReason: null,
    dataIssues: [],
    ...overrides,
  };
}

describe("getDeadlineInfo and formatCountdown", () => {
  it("calculates correct durations for P0, P1, P2, P3", () => {
    expect(PRIORITY_HOURS.P0).toBe(1);
    expect(PRIORITY_HOURS.P1).toBe(4);
    expect(PRIORITY_HOURS.P2).toBe(24);
    expect(PRIORITY_HOURS.P3).toBe(72);

    const baseCreated = new Date("2026-09-20T10:00:00.000Z").getTime();

    // P0: 1h deadline = 11:00:00
    const p0Ticket = makeTicket({ priority: "P0", createdAt: "2026-09-20T10:00:00.000Z" });
    const p0Info = getDeadlineInfo(p0Ticket, baseCreated + 30 * 60 * 1000); // at 10:30 (50% remaining)
    expect(p0Info.state).toBe("on_track");
    expect(p0Info.remainingMs).toBe(30 * 60 * 1000);
    expect(p0Info.deadlineIso).toBe("2026-09-20T11:00:00.000Z");

    // P1: 4h deadline = 14:00:00
    const p1Ticket = makeTicket({ priority: "P1", createdAt: "2026-09-20T10:00:00.000Z" });
    const p1Info = getDeadlineInfo(p1Ticket, baseCreated + 2 * 3600 * 1000);
    expect(p1Info.deadlineIso).toBe("2026-09-20T14:00:00.000Z");

    // P2: 24h deadline = 2026-09-21T10:00:00.000Z
    const p2Ticket = makeTicket({ priority: "P2", createdAt: "2026-09-20T10:00:00.000Z" });
    const p2Info = getDeadlineInfo(p2Ticket, baseCreated);
    expect(p2Info.deadlineIso).toBe("2026-09-21T10:00:00.000Z");

    // P3: 72h deadline = 2026-09-23T10:00:00.000Z
    const p3Ticket = makeTicket({ priority: "P3", createdAt: "2026-09-20T10:00:00.000Z" });
    const p3Info = getDeadlineInfo(p3Ticket, baseCreated);
    expect(p3Info.deadlineIso).toBe("2026-09-23T10:00:00.000Z");
  });

  it("handles 20% boundary conditions strictly (exactly 20% is on_track, < 20% is at_risk)", () => {
    // P1 total = 4h = 14400000 ms. 20% of 4h = 2880000 ms (48 mins).
    const createdTime = new Date("2026-09-20T10:00:00.000Z").getTime();
    const totalMs = 4 * 3600 * 1000;
    const deadlineMs = createdTime + totalMs;

    const ticket = makeTicket({ priority: "P1", createdAt: "2026-09-20T10:00:00.000Z" });

    // Exactly 20% left -> on_track
    const exact20Now = deadlineMs - 0.2 * totalMs;
    const exactInfo = getDeadlineInfo(ticket, exact20Now);
    expect(exactInfo.state).toBe("on_track");

    // 1 second under 20% -> at_risk
    const under20Now = exact20Now + 1000;
    const underInfo = getDeadlineInfo(ticket, under20Now);
    expect(underInfo.state).toBe("at_risk");
  });

  it("identifies late tickets at remainingMs <= 0 and negative remaining time", () => {
    const createdTime = new Date("2026-09-20T10:00:00.000Z").getTime();
    const totalMs = 4 * 3600 * 1000;
    const deadlineMs = createdTime + totalMs;

    const ticket = makeTicket({ priority: "P1", createdAt: "2026-09-20T10:00:00.000Z" });

    // Exactly at deadline (remaining 0)
    const exactZero = getDeadlineInfo(ticket, deadlineMs);
    expect(exactZero.state).toBe("late");
    expect(exactZero.remainingMs).toBe(0);

    // 1 second past deadline
    const pastOneSec = getDeadlineInfo(ticket, deadlineMs + 1000);
    expect(pastOneSec.state).toBe("late");
    expect(pastOneSec.remainingMs).toBe(-1000);
  });

  it("returns 'done' for resolved or closed tickets without remainingMs", () => {
    const now = Date.now();
    const resolvedTicket = makeTicket({ status: "resolved" });
    const closedTicket = makeTicket({ status: "closed" });

    expect(getDeadlineInfo(resolvedTicket, now)).toEqual({
      state: "done",
      remainingMs: null,
      deadlineIso: null,
    });

    expect(getDeadlineInfo(closedTicket, now)).toEqual({
      state: "done",
      remainingMs: null,
      deadlineIso: null,
    });
  });

  it("returns 'none' for invalid/null createdAt or priority", () => {
    const now = Date.now();
    expect(getDeadlineInfo(makeTicket({ createdAt: null }), now).state).toBe("none");
    expect(getDeadlineInfo(makeTicket({ createdAt: "not-a-date" }), now).state).toBe("none");
    expect(getDeadlineInfo(makeTicket({ priority: null }), now).state).toBe("none");
    expect(getDeadlineInfo(makeTicket({ createdAt: null, priority: null }), now).state).toBe("none");
  });

  it("returns 'future_date' when createdAt is in the future", () => {
    const now = new Date("2026-09-20T10:00:00.000Z").getTime();
    const futureTicket = makeTicket({
      createdAt: "2026-09-25T10:00:00.000Z", // future relative to now
      priority: "P1",
    });

    const info = getDeadlineInfo(futureTicket, now);
    expect(info.state).toBe("future_date");
    expect(info.remainingMs).toBe(null);
    expect(info.deadlineIso).toBe("2026-09-25T14:00:00.000Z");
  });

  it("formats countdown correctly including days and late prefix", () => {
    // 30 seconds
    expect(formatCountdown(30000)).toBe("00:00:30");

    // 1 hour 2 mins 3 secs
    const ms1 = (1 * 3600 + 2 * 60 + 3) * 1000;
    expect(formatCountdown(ms1)).toBe("01:02:03");

    // 2 days 3 hours 4 mins 5 secs
    const ms2 = (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000;
    expect(formatCountdown(ms2)).toBe("2d 03:04:05");

    // Late countdown (counting up)
    expect(formatCountdown(-65000, "late")).toBe("Late by 00:01:05");
    expect(formatCountdown(-1 * 86400 * 1000 - 3600000)).toBe("Late by 1d 01:00:00");

    // Null or NaN
    expect(formatCountdown(null)).toBe("");
    expect(formatCountdown(NaN)).toBe("");
  });
});
