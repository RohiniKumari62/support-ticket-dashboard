import { describe, it, expect } from "vitest";
import {
  formatDateTime,
  formatDateTimeFull,
  getDeadline,
} from "@/lib/tickets/time";

describe("lib/tickets/time", () => {
  const baseIso = "2026-09-20T10:00:00.000Z";

  it("calculates P0 deadline as +1 hour", () => {
    expect(getDeadline(baseIso, "P0")).toBe("2026-09-20T11:00:00.000Z");
  });

  it("calculates P1 deadline as +4 hours", () => {
    expect(getDeadline(baseIso, "P1")).toBe("2026-09-20T14:00:00.000Z");
  });

  it("calculates P2 deadline as +24 hours", () => {
    expect(getDeadline(baseIso, "P2")).toBe("2026-09-21T10:00:00.000Z");
  });

  it("calculates P3 deadline as +72 hours", () => {
    expect(getDeadline(baseIso, "P3")).toBe("2026-09-23T10:00:00.000Z");
  });

  it("returns null for invalid createdAt or priority", () => {
    expect(getDeadline(null, "P0")).toBeNull();
    expect(getDeadline("invalid-date", "P0")).toBeNull();
    expect(getDeadline(baseIso, null)).toBeNull();
    // @ts-expect-error test invalid priority input
    expect(getDeadline(baseIso, "P5")).toBeNull();
  });

  it("formats date in UTC deterministic format and returns '—' for null", () => {
    expect(formatDateTime("2026-09-20T09:15:00.000Z")).toBe("20 Sep, 09:15");
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("invalid")).toBe("—");
  });

  it("returns full UTC date string for tooltip title attribute", () => {
    expect(formatDateTimeFull("2026-09-20T09:15:00.000Z")).toBe(
      "2026-09-20 09:15 UTC"
    );
    expect(formatDateTimeFull(null)).toBe("");
  });
});
