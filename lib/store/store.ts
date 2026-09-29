import {
  combineReducers,
  configureStore,
} from "@reduxjs/toolkit";
import ticketsReducer from "./tickets-slice";
import agentReducer from "./agent-slice";
import filtersReducer from "./filters-slice";
import { ticketsApiClient, type TicketsApiClient } from "@/lib/api/tickets-client";

export interface ThunkExtra {
  api: TicketsApiClient;
}

const rootReducer = combineReducers({
  tickets: ticketsReducer,
  agent: agentReducer,
  filters: filtersReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export function makeStore(
  preloadedState?: Partial<RootState>,
  extra?: Partial<ThunkExtra>
) {
  const thunkExtra: ThunkExtra = {
    api: extra?.api ?? ticketsApiClient,
  };

  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: {
          extraArgument: thunkExtra,
        },
      }),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
