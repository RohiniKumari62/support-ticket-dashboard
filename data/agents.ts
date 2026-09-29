import type { Agent } from "@/types/ticket";

export const AGENTS: readonly Agent[] = [
  { id: "agent-1", name: "Priya" },
  { id: "agent-2", name: "Rahul" },
  { id: "agent-3", name: "Meera" },
] as const;

export const AGENT_MAP: Record<string, string> = {
  "agent-1": "Priya",
  "agent-2": "Rahul",
  "agent-3": "Meera",
};

export function getAgentName(agentId: string | null): string | null {
  if (!agentId) return null;
  return AGENT_MAP[agentId] ?? null;
}

export function isValidAgentId(agentId: string | null): boolean {
  if (!agentId) return false;
  return agentId in AGENT_MAP;
}
