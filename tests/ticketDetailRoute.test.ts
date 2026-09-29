import { describe, it, expect, vi } from "vitest";
import { getTicketById } from "@/lib/tickets/data";
import TicketDetailPage from "@/app/tickets/[id]/page";

// Mock next/navigation notFound
const mockNotFound = vi.fn();
vi.mock("next/navigation", () => ({
  notFound: () => {
    mockNotFound();
    throw new Error("NEXT_NOT_FOUND");
  },
}));

describe("Ticket detail route handling", () => {
  describe("getTicketById", () => {
    it("returns null for unknown ticket ID (T-9999)", () => {
      expect(getTicketById("T-9999")).toBeNull();
    });

    it("returns null for malformed or empty ID", () => {
      expect(getTicketById("")).toBeNull();
      expect(getTicketById(null as unknown as string)).toBeNull();
      expect(getTicketById("%E0%A4%A")).toBeNull();
    });

    it("returns ticket for known ID (T-2001)", () => {
      const ticket = getTicketById("T-2001");
      expect(ticket).not.toBeNull();
      expect(ticket?.id).toBe("T-2001");
    });
  });

  describe("TicketDetailPage server component", () => {
    it("calls notFound() for unknown ticket ID (T-9999)", async () => {
      mockNotFound.mockClear();

      await expect(
        TicketDetailPage({ params: Promise.resolve({ id: "T-9999" }) })
      ).rejects.toThrow("NEXT_NOT_FOUND");

      expect(mockNotFound).toHaveBeenCalled();
    });

    it("calls notFound() for malformed URI-encoded garbage ID (%E0%A4%A)", async () => {
      mockNotFound.mockClear();

      await expect(
        TicketDetailPage({ params: Promise.resolve({ id: "%E0%A4%A" }) })
      ).rejects.toThrow("NEXT_NOT_FOUND");

      expect(mockNotFound).toHaveBeenCalled();
    });

    it("calls notFound() for excessively long ID (> 64 chars)", async () => {
      mockNotFound.mockClear();

      const overlyLongId = "a".repeat(65);
      await expect(
        TicketDetailPage({ params: Promise.resolve({ id: overlyLongId }) })
      ).rejects.toThrow("NEXT_NOT_FOUND");

      expect(mockNotFound).toHaveBeenCalled();
    });
  });
});
