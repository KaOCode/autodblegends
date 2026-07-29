import { createContext, useContext, type ReactNode } from "react";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { useGameData } from "./useGameData";

type AppContextValue = ReturnType<typeof useAuth> &
  ReturnType<typeof useProfile> &
  ReturnType<typeof useGameData>;

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const profile = useProfile(auth.session);
  const gameData = useGameData();

  const value: AppContextValue = { ...auth, ...profile, ...gameData };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
