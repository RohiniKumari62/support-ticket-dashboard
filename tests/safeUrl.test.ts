import { describe, it, expect } from "vitest";
import { getSafeUrl } from "@/lib/safe-url";

describe("getSafeUrl", () => {
  it("allows valid http and https URLs", () => {
    expect(getSafeUrl("https://example.com/file.png")).toBe(
      "https://example.com/file.png"
    );
    expect(getSafeUrl("http://files.example.com/doc.pdf")).toBe(
      "http://files.example.com/doc.pdf"
    );
  });

  it("rejects javascript: URLs", () => {
    expect(getSafeUrl("javascript:alert(document.cookie)")).toBeNull();
    expect(getSafeUrl("JAVASCRIPT:alert(1)")).toBeNull();
  });

  it("rejects data: and vbscript: URLs", () => {
    expect(getSafeUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(getSafeUrl("vbscript:msgbox('hi')")).toBeNull();
  });

  it("rejects null, undefined, empty, and garbage strings", () => {
    expect(getSafeUrl(null)).toBeNull();
    expect(getSafeUrl(undefined)).toBeNull();
    expect(getSafeUrl("")).toBeNull();
    expect(getSafeUrl("   ")).toBeNull();
    expect(getSafeUrl("not a url")).toBeNull();
    expect(getSafeUrl("/relative/path")).toBeNull();
  });
});
