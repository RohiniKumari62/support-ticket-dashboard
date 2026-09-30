import { describe, it, expect } from "vitest";
import { getSafeUrl } from "@/lib/safe-url";

describe("getSafeUrl hardening (Phase 10)", () => {
  it("accepts valid https and http URLs", () => {
    expect(getSafeUrl("https://example.com/file.png")).toBe(
      "https://example.com/file.png"
    );
    expect(getSafeUrl("http://example.com/file.png")).toBe(
      "http://example.com/file.png"
    );
    expect(getSafeUrl("https://sub.domain.org/path?query=1#hash")).toBe(
      "https://sub.domain.org/path?query=1#hash"
    );
  });

  it("rejects dangerous URL schemes", () => {
    expect(getSafeUrl("javascript:alert(1)")).toBeNull();
    expect(getSafeUrl("javascript:alert(document.cookie)")).toBeNull();
    expect(getSafeUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(getSafeUrl("vbscript:msgbox(1)")).toBeNull();
    expect(getSafeUrl("file:///etc/passwd")).toBeNull();
    expect(getSafeUrl("blob:https://example.com/uuid")).toBeNull();
  });

  it("rejects protocol-relative URLs", () => {
    expect(getSafeUrl("//evil.com/payload")).toBeNull();
    expect(getSafeUrl("//example.com")).toBeNull();
  });

  it("rejects URLs with embedded credentials", () => {
    expect(getSafeUrl("https://user:pass@example.com")).toBeNull();
    expect(getSafeUrl("http://admin:secret@example.com/dashboard")).toBeNull();
  });

  it("rejects URLs exceeding 2048 characters", () => {
    const longPath = "a".repeat(2040);
    const longUrl = `https://example.com/${longPath}`;
    expect(longUrl.length).toBeGreaterThan(2048);
    expect(getSafeUrl(longUrl)).toBeNull();
  });

  it("rejects internal whitespace and control characters", () => {
    expect(getSafeUrl("https://example.com/file\nname")).toBeNull();
    expect(getSafeUrl("https://example.com/file\tname")).toBeNull();
    expect(getSafeUrl("https://example .com/file")).toBeNull();
    expect(getSafeUrl("https://example.com/\x00evil")).toBeNull();
  });

  it("rejects malformed, empty, or non-string inputs", () => {
    expect(getSafeUrl("")).toBeNull();
    expect(getSafeUrl("   ")).toBeNull();
    expect(getSafeUrl(null)).toBeNull();
    expect(getSafeUrl(undefined)).toBeNull();
    expect(getSafeUrl("not a url")).toBeNull();
    expect(getSafeUrl("/relative/path")).toBeNull();
  });
});
