import { describe, it, expect, afterEach, vi } from "vitest";
import nextConfig from "@/next.config";

describe("Security Headers and CSP (Phase 10)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("next.config headers() returns comprehensive security headers", async () => {
    expect(nextConfig.headers).toBeDefined();
    if (!nextConfig.headers) return;

    vi.stubEnv("NODE_ENV", "production");
    const headerConfigs = await nextConfig.headers();

    expect(headerConfigs).toHaveLength(1);
    const mainConfig = headerConfigs[0];

    expect(mainConfig.source).toBe("/:path*");

    const headerMap = new Map(
      mainConfig.headers.map((h) => [h.key.toLowerCase(), h.value])
    );

    // X-Content-Type-Options: nosniff
    expect(headerMap.get("x-content-type-options")).toBe("nosniff");

    // X-Frame-Options: DENY
    expect(headerMap.get("x-frame-options")).toBe("DENY");

    // Referrer-Policy: strict-origin-when-cross-origin
    expect(headerMap.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin"
    );

    // Permissions-Policy denying sensitive hardware APIs
    const permissions = headerMap.get("permissions-policy");
    expect(permissions).toContain("camera=()");
    expect(permissions).toContain("microphone=()");
    expect(permissions).toContain("geolocation=()");
    expect(permissions).toContain("payment=()");
    expect(permissions).toContain("usb=()");

    // Content-Security-Policy
    const csp = headerMap.get("content-security-policy");
    expect(csp).toBeDefined();
    if (!csp) return;

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("img-src 'self' data:");
    expect(csp).toContain("font-src 'self' data:");

    // In production: no unsafe-eval in script-src
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("CSP in development includes unsafe-eval and websocket support for HMR", async () => {
    if (!nextConfig.headers) return;

    vi.stubEnv("NODE_ENV", "development");
    const headerConfigs = await nextConfig.headers();
    const mainConfig = headerConfigs[0];
    const headerMap = new Map(
      mainConfig.headers.map((h) => [h.key.toLowerCase(), h.value])
    );

    const csp = headerMap.get("content-security-policy");
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("ws:");
  });
});
