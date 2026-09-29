/**
 * Safe URL validation
 *
 * Validates that an attachment or link URL is strictly HTTP or HTTPS.
 * Rejects javascript:, data:, vbscript:, malformed, or relative URLs.
 */
export function getSafeUrl(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}
