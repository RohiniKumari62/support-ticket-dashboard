/**
 * Safe URL validation
 *
 * Validates that an attachment or link URL is strictly HTTP or HTTPS.
 * Hardened per Phase 10 specifications:
 * - Allows only http: and https: protocols
 * - Rejects URLs exceeding 2048 characters
 * - Rejects URLs containing embedded credentials (username/password)
 * - Rejects control characters and internal whitespace
 * - Rejects javascript:, data:, vbscript:, file:, blob:, protocol-relative (//), etc.
 * - Returns the canonical normalized href string
 */
export function getSafeUrl(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) {
    return null;
  }

  // Reject internal whitespace or control characters
  if (/[\x00-\x20\x7F]/.test(trimmed)) {
    return null;
  }

  // Reject protocol-relative URLs (e.g. "//evil.com")
  if (trimmed.startsWith("//")) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);

    // Strictly HTTP or HTTPS
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    // Reject embedded credentials (e.g. http://user:pass@example.com)
    if (parsed.username || parsed.password) {
      return null;
    }

    // Must have a valid hostname
    if (!parsed.hostname) {
      return null;
    }

    return parsed.href;
  } catch {
    return null;
  }
}
