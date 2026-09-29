import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { DEFAULT_AGENT_ID, isValidAgentId } from "@/data/agents";

export interface AgentState {
  currentAgentId: string;
  hydrated: boolean;
}

const initialState: AgentState = {
  currentAgentId: DEFAULT_AGENT_ID,
  hydrated: false,
};

export const agentSlice = createSlice({
  name: "agent",
  initialState,
  reducers: {
    agentSelected(state, action: PayloadAction<string>) {
      if (isValidAgentId(action.payload)) {
        state.currentAgentId = action.payload;
      }
    },
    agentHydrated(state, action: PayloadAction<string | null>) {
      if (action.payload && isValidAgentId(action.payload)) {
        state.currentAgentId = action.payload;
      }
      state.hydrated = true;
    },
  },
});

export const { agentSelected, agentHydrated } = agentSlice.actions;
export default agentSlice.reducer;
