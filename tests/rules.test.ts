import { describe, it, expect } from "vitest";
import { applyEnterpriseFloor } from "@/lib/tickets/rules";

describe("lib/tickets/rules", () => {
  describe("applyEnterpriseFloor", () => {
    it("raises enterprise P3 to P1", () => {
      expect(applyEnterpriseFloor("enterprise", "P3")).toBe("P1");
    });

    it("raises enterprise P2 to P1", () => {
      expect(applyEnterpriseFloor("enterprise", "P2")).toBe("P1");
    });

    it("keeps enterprise P0 at P0", () => {
      expect(applyEnterpriseFloor("enterprise", "P0")).toBe("P0");
    });

    it("keeps enterprise P1 at P1", () => {
      expect(applyEnterpriseFloor("enterprise", "P1")).toBe("P1");
    });

    it("keeps pro P3 at P3", () => {
      expect(applyEnterpriseFloor("pro", "P3")).toBe("P3");
    });

    it("keeps free P3 at P3", () => {
      expect(applyEnterpriseFloor("free", "P3")).toBe("P3");
    });

    it("returns null when priority is null or undefined", () => {
      expect(applyEnterpriseFloor("enterprise", null)).toBeNull();
      expect(applyEnterpriseFloor("enterprise", undefined)).toBeNull();
      expect(applyEnterpriseFloor("pro", null)).toBeNull();
      expect(applyEnterpriseFloor(null, null)).toBeNull();
    });
  });
});
