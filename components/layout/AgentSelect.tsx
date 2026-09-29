"use client";

// Native <select> is used intentionally:
// - Lighter than a custom dropdown (no JS for positioning/focus trapping)
// - Better keyboard and screen-reader support on mobile
// - Agent identity management (Redux + persistence) arrives in Phase 6

const AGENTS = [
  { id: "agent-1", name: "Priya" },
  { id: "agent-2", name: "Rahul" },
  { id: "agent-3", name: "Meera" },
] as const;

export function AgentSelect() {
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="agent-select"
        className="text-sm text-[oklch(0.44_0.019_264.4)] whitespace-nowrap"
      >
        Agent
      </label>
      <select
        id="agent-select"
        defaultValue="agent-1"
        className={[
          "h-10 min-w-[7rem] rounded border border-[oklch(0.902_0.007_264.5)]",
          "bg-white px-2 py-0 text-sm text-[oklch(0.129_0.014_254.6)]",
          "cursor-pointer appearance-none",
          "focus-visible:outline-2 focus-visible:outline-offset-2",
          "focus:outline-2 focus:outline-[oklch(0.546_0.245_262.9)] focus:outline-offset-2",
        ].join(" ")}
        aria-label="Select agent"
      >
        {AGENTS.map(({ id, name }) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
