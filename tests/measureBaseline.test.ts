import { describe, it, expect } from "vitest";
import { buildSeed } from "@/lib/server/seed";
import { TicketStore } from "@/lib/server/ticket-store";

describe("Phase 11 Baseline Measurements", () => {
  it("measures cold seed generation, 50-item payload, and scope=counts scale", () => {
    // 1. Cold seed generation
    const t0 = performance.now();
    const seed = buildSeed({ now: 1720000000000 });
    const seedTime = performance.now() - t0;
    
    console.log("=== BASELINE MEASUREMENTS ===");
    console.log(`Seed count: ${seed.tickets.length} tickets`);
    console.log(`Duplicates removed at seed: ${seed.duplicatesRemoved}`);
    console.log(`Cold seed build time: ${seedTime.toFixed(2)} ms`);

    // 2. In-memory TicketStore initialisation
    const tStore0 = performance.now();
    const store = new TicketStore({
      tickets: seed.tickets,
      duplicatesRemoved: seed.duplicatesRemoved,
    });
    const storeInitTime = performance.now() - tStore0;
    console.log(`TicketStore init time: ${storeInitTime.toFixed(2)} ms`);

    // 3. Size of GET /api/tickets?limit=50
    const listRes = store.list({ limit: 50 });
    if (!listRes.ok) throw new Error("List failed");
    const payloadJson = JSON.stringify(listRes);
    const payloadBytes = new TextEncoder().encode(payloadJson).length;
    console.log(`GET /api/tickets?limit=50 item count: ${listRes.tickets.length}`);
    console.log(`GET /api/tickets?limit=50 payload size: ${(payloadBytes / 1024).toFixed(2)} KB (${payloadBytes} bytes)`);

    // 4. Search query performance at ~5,000 tickets
    const tSearch0 = performance.now();
    const searchRes = store.list({ q: "billing", limit: 50 });
    if (!searchRes.ok) throw new Error("Search failed");
    const searchTime = performance.now() - tSearch0;
    console.log(`Search 'billing' matches: ${searchRes.total} tickets, time: ${searchTime.toFixed(2)} ms`);

    // 5. scope=counts scale check
    let countedPages = 0;
    let countedTotal = 0;
    let cursor: string | undefined = undefined;
    const tCounts0 = performance.now();

    while (true) {
      countedPages++;
      const res = store.list({ scope: "counts", cursor, limit: 200 });
      if (!res.ok) break;
      countedTotal += res.tickets.length;
      if (!res.nextCursor || res.tickets.length === 0) {
        break;
      }
      cursor = res.nextCursor;
    }
    const countsTime = performance.now() - tCounts0;

    console.log(`scope=counts total matching tickets: ${countedTotal}`);
    console.log(`scope=counts pages required (limit 200): ${countedPages}`);
    console.log(`scope=counts bootstrap time (in-memory): ${countsTime.toFixed(2)} ms`);

    expect(seed.tickets.length).toBeGreaterThan(4900);
    expect(listRes.tickets.length).toBe(50);
  });
});
