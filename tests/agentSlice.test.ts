import { describe, expect, it, vi } from "vitest";
import agentReducer, {
  agentHydrated,
  agentSelected,
} from "@/lib/store/agent-slice";
import {
  AGENT_STORAGE_KEY,
  readStoredAgentId,
  storeAgentId,
} from "@/lib/agents/agent-storage";

describe("Agent slice and storage", () => {
  it("initializes with default agent-1 and unhydrated", () => {
    const state = agentReducer(undefined, { type: "@@INIT" });
    expect(state.currentAgentId).toBe("agent-1");
    expect(state.hydrated).toBe(false);
  });

  it("agentHydrated sets valid stored agent and marks hydrated true", () => {
    let state = agentReducer(undefined, { type: "@@INIT" });
    state = agentReducer(state, agentHydrated("agent-2"));
    expect(state.currentAgentId).toBe("agent-2");
    expect(state.hydrated).toBe(true);
  });

  it("agentHydrated ignores invalid/garbage agent ID and keeps default", () => {
    let state = agentReducer(undefined, { type: "@@INIT" });
    state = agentReducer(state, agentHydrated("hacker-agent"));
    expect(state.currentAgentId).toBe("agent-1");
    expect(state.hydrated).toBe(true);

    state = agentReducer(state, agentHydrated(null));
    expect(state.currentAgentId).toBe("agent-1");
    expect(state.hydrated).toBe(true);
  });

  it("agentSelected changes agent for valid ID and ignores unknown IDs", () => {
    let state = agentReducer(undefined, { type: "@@INIT" });
    state = agentReducer(state, agentSelected("agent-3"));
    expect(state.currentAgentId).toBe("agent-3");

    // Unknown ID is ignored
    state = agentReducer(state, agentSelected("invalid-agent"));
    expect(state.currentAgentId).toBe("agent-3");
  });

  it("readStoredAgentId and storeAgentId interact safely with localStorage", () => {
    const mockStorage: Record<string, string> = {};
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => mockStorage[key] ?? null);
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, val) => {
      mockStorage[key] = val;
    });

    try {
      // Store valid agent
      storeAgentId("agent-2");
      expect(mockStorage[AGENT_STORAGE_KEY]).toBe("agent-2");
      expect(readStoredAgentId()).toBe("agent-2");

      // Attempt to store invalid agent
      storeAgentId("invalid-agent");
      expect(mockStorage[AGENT_STORAGE_KEY]).toBe("agent-2"); // unchanged

      // Corrupt storage with garbage
      mockStorage[AGENT_STORAGE_KEY] = "<script>alert(1)</script>";
      expect(readStoredAgentId()).toBeNull();
    } finally {
      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
    }
  });

  it("handles localStorage exceptions (e.g. security sandbox) without crashing", () => {
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError: Access is denied");
    });
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    try {
      expect(readStoredAgentId()).toBeNull();
      expect(() => storeAgentId("agent-1")).not.toThrow();
    } finally {
      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
    }
  });
});
