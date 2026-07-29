import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

interface AuthState {
  session: Session | null;
  loading: boolean;
}

const initialState: AuthState = {
  session: null,
  loading: Boolean(supabase),
};

export const signInWithEmail = createAsyncThunk<{ error: string | null }, string>(
  "auth/signInWithEmail",
  async (email) => {
    if (!supabase) return { error: "Cloud-Sync ist nicht konfiguriert." };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  },
);

export const signOut = createAsyncThunk("auth/signOut", async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<Session | null>) {
      state.session = action.payload;
      state.loading = false;
    },
  },
});

export const { setSession } = authSlice.actions;
export default authSlice.reducer;
