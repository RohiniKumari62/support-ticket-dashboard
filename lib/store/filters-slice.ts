import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { EMPTY_FILTERS, type TicketFilters } from "@/lib/tickets/filters";

export type FiltersState = TicketFilters;

const initialState: FiltersState = EMPTY_FILTERS;

export const filtersSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    filtersChanged(_state, action: PayloadAction<TicketFilters>) {
      return action.payload;
    },
  },
});

export const { filtersChanged } = filtersSlice.actions;
export default filtersSlice.reducer;
