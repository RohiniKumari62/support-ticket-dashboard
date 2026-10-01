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
    <div className="flex items-center gap-1.5 sm:gap-2">
      <label
        htmlFor="agent-select"
        className="text-sm text-slate-600 whitespace-nowrap"
      >
        Agent
      </label>
      <div className="relative inline-flex items-center rounded border border-slate-200 bg-white pl-1.5 pr-2">
        {/* User avatar icon */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/avatar-user.png"
          alt=""
          aria-hidden="true"
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
          className="h-7 w-7 shrink-0 rounded-full object-cover select-none"
        />
        {/* Native select */}
        <select
          id="agent-select"
          value={currentAgentId}
          onChange={handleChange}
          className="h-9 min-w-[5.5rem] sm:min-w-[6.5rem] bg-transparent pl-1.5 pr-5 text-sm text-slate-900 cursor-pointer appearance-none border-0 outline-none focus:outline-none"
        >
          {AGENTS.map(({ id, name }) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        {/* Chevron icon */}
        <svg
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
}
