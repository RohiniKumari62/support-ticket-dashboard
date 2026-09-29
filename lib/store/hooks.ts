import {
  type TypedUseSelectorHook,
  useDispatch,
  useSelector,
  useStore,
} from "react-redux";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AppDispatch, AppStore, RootState, ThunkExtra } from "./store";

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useAppStore: () => AppStore = useStore;

export const createAppAsyncThunk = createAsyncThunk.withTypes<{
  state: RootState;
  dispatch: AppDispatch;
  extra: ThunkExtra;
  rejectValue: {
    code?: string;
    message?: string;
    ticket?: import("@/types/ticket").Ticket;
    assignedTo?: string;
  };
}>();
