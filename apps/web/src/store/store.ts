import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import profileReducer from "./profileSlice";
import gameDataReducer from "./gameDataSlice";
import { saveInventory, saveTeams } from "../lib/storage";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
    gameData: gameDataReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Supabase's Session object nests non-plain fields in some SDK
      // versions; the app never mutates it, so relaxing this check here is
      // safe and avoids noisy false positives.
      serializableCheck: { ignoredPaths: ["auth.session"] },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

let prevInventory = store.getState().profile.inventory;
let prevTeams = store.getState().profile.teams;
store.subscribe(() => {
  const { inventory, teams } = store.getState().profile;
  if (inventory !== prevInventory) {
    saveInventory(inventory);
    prevInventory = inventory;
  }
  if (teams !== prevTeams) {
    saveTeams(teams);
    prevTeams = teams;
  }
});
