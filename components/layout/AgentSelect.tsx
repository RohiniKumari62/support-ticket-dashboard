"use client";

import { AGENTS } from "@/data/agents";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { selectCurrentAgentId } from "@/lib/store/tickets-selectors";
import { agentSelected } from "@/lib/store/agent-slice";
import { storeAgentId } from "@/lib/agents/agent-storage";

export function AgentSelect() {
  const dispatch = useAppDispatch();
  const currentAgentId = useAppSelector(selectCurrentAgentId);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = e.target.value;
    dispatch(agentSelected(nextId));
    storeAgentId(nextId);
  };

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
        value={currentAgentId}
        onChange={handleChange}
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
