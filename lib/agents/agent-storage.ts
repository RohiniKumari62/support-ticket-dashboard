import { isValidAgentId } from "@/data/agents";

export const AGENT_STORAGE_KEY = "support-dashboard:current-agent";

/**
 * Reads the stored agent ID from localStorage in a safe manner.
 * Returns null if not in a browser environment, storage is disabled,
 * or the stored value is not a valid known agent ID.
 */
export function readStoredAgentId(): string | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(AGENT_STORAGE_KEY);
    if (stored && isValidAgentId(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage read errors (e.g. security sandbox or disabled localStorage)
  }

  return null;
}

/**
 * Writes the given agent ID to localStorage if valid.
 * Ignores errors (e.g. quota exceeded or storage blocked).
 */
export function storeAgentId(agentId: string): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  if (!isValidAgentId(agentId)) {
    return;
  }

  try {
    window.localStorage.setItem(AGENT_STORAGE_KEY, agentId);
  } catch {
    // Ignore storage write errors
  }
}
