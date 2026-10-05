import { describe, it, expect } from "vitest";
import { buildSeed } from "@/lib/server/seed";
import { createRng } from "@/lib/server/rng";
import { sortTickets } from "@/lib/tickets/sort";
import type { Ticket } from "@/types/ticket";

describe("seed reproducibility", () => {
  it("generates deterministic seeds with createRng", () => {
    const seed1 = buildSeed({ random: createRng(42) });
    const seed2 = buildSeed({ random: createRng(42) });
    expect(seed1.tickets[0].id).toBe(seed2.tickets[0].id);

    const open1 = seed1.tickets.filter((t: Ticket) => t.status === "open");
    const open2 = seed2.tickets.filter((t: Ticket) => t.status === "open");
    expect(open1.length).toBe(open2.length);

    const sorted = sortTickets(seed1.tickets);
    sorted.forEach((t: Ticket, idx: number) => {
      expect(t.id).toBeDefined();
      expect(idx).toBeGreaterThanOrEqual(0);
    });
  });
});
