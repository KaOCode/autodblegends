import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { InventoryEntry, Team } from "@autodbl/shared";
import { supabase } from "../lib/supabaseClient";
import { loadInventory, loadTeams } from "../lib/storage";
import type { RootState } from "./store";

interface ProfileState {
  inventory: InventoryEntry[];
  teams: Team[];
  /** user id we've already merged local <-> cloud for, guards against
   * re-syncing on every re-render once signed in */
  syncedUserId: string | null;
}

const initialState: ProfileState = {
  inventory: loadInventory(),
  teams: loadTeams(),
  syncedUserId: null,
};

interface CloudInventoryRow {
  character_id: number;
  stars: number;
  level: number;
  is_z_awakened: boolean;
  copies: number;
  updated_at: string;
}

interface CloudTeamRow {
  id: string;
  name: string;
  mode: Team["mode"];
  slots: Team["slots"];
  support_item_ids: string[];
  created_at: string;
  updated_at: string;
}

function fromCloudInventory(row: CloudInventoryRow): InventoryEntry {
  return {
    characterId: row.character_id,
    stars: row.stars,
    level: row.level,
    isZAwakened: row.is_z_awakened,
    copies: row.copies,
    updatedAt: row.updated_at,
  };
}

function fromCloudTeam(row: CloudTeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    mode: row.mode,
    slots: row.slots,
    supportItemIds: row.support_item_ids,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mergeByUpdatedAt<T extends { updatedAt: string }>(a: T[], b: T[], keyOf: (x: T) => string): T[] {
  const byKey = new Map<string, T>();
  for (const item of [...a, ...b]) {
    const key = keyOf(item);
    const existing = byKey.get(key);
    if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()];
}

/** Runs once per sign-in: pulls the user's cloud inventory/teams, merges
 * them with whatever's already local (newest-wins by updatedAt), stores the
 * merged result, and pushes it back so both sides agree. */
export const syncWithCloud = createAsyncThunk<
  { inventory: InventoryEntry[]; teams: Team[] } | null,
  string,
  { state: RootState }
>("profile/syncWithCloud", async (userId, { getState }) => {
  if (!supabase) return null;
  const state = getState();

  const [{ data: cloudInv }, { data: cloudTeams }] = await Promise.all([
    supabase.from("user_inventory").select("*").eq("user_id", userId),
    supabase.from("user_teams").select("*").eq("user_id", userId),
  ]);

  const mergedInventory = mergeByUpdatedAt(
    state.profile.inventory,
    (cloudInv ?? []).map(fromCloudInventory),
    (x) => String(x.characterId),
  );
  const mergedTeams = mergeByUpdatedAt(state.profile.teams, (cloudTeams ?? []).map(fromCloudTeam), (x) => x.id);

  await Promise.all([
    supabase.from("user_inventory").upsert(
      mergedInventory.map((e) => ({
        user_id: userId,
        character_id: e.characterId,
        stars: e.stars,
        level: e.level,
        is_z_awakened: e.isZAwakened,
        copies: e.copies,
        updated_at: e.updatedAt,
      })),
    ),
    mergedTeams.length > 0
      ? supabase.from("user_teams").upsert(
          mergedTeams.map((t) => ({
            id: t.id,
            user_id: userId,
            name: t.name,
            mode: t.mode,
            slots: t.slots,
            support_item_ids: t.supportItemIds,
            created_at: t.createdAt,
            updated_at: t.updatedAt,
          })),
        )
      : Promise.resolve(),
  ]);

  return { inventory: mergedInventory, teams: mergedTeams };
});

function pushInventoryEntry(userId: string | undefined, entry: InventoryEntry) {
  if (!supabase || !userId) return;
  void supabase.from("user_inventory").upsert({
    user_id: userId,
    character_id: entry.characterId,
    stars: entry.stars,
    level: entry.level,
    is_z_awakened: entry.isZAwakened,
    copies: entry.copies,
    updated_at: entry.updatedAt,
  });
}

export const upsertInventoryEntry = createAsyncThunk<void, Omit<InventoryEntry, "updatedAt">, { state: RootState }>(
  "profile/upsertInventoryEntry",
  (entry, { dispatch, getState }) => {
    const withTimestamp: InventoryEntry = { ...entry, updatedAt: new Date().toISOString() };
    dispatch(profileSlice.actions.upsertInventoryEntryLocal(withTimestamp));
    pushInventoryEntry(getState().auth.session?.user.id, withTimestamp);
  },
);

export const removeInventoryEntry = createAsyncThunk<void, number, { state: RootState }>(
  "profile/removeInventoryEntry",
  (characterId, { dispatch, getState }) => {
    dispatch(profileSlice.actions.removeInventoryEntryLocal(characterId));
    const userId = getState().auth.session?.user.id;
    if (supabase && userId) {
      void supabase.from("user_inventory").delete().eq("user_id", userId).eq("character_id", characterId);
    }
  },
);

export const saveTeam = createAsyncThunk<void, Team, { state: RootState }>(
  "profile/saveTeam",
  (team, { dispatch, getState }) => {
    dispatch(profileSlice.actions.saveTeamLocal(team));
    const userId = getState().auth.session?.user.id;
    if (supabase && userId) {
      void supabase.from("user_teams").upsert({
        id: team.id,
        user_id: userId,
        name: team.name,
        mode: team.mode,
        slots: team.slots,
        support_item_ids: team.supportItemIds,
        created_at: team.createdAt,
        updated_at: team.updatedAt,
      });
    }
  },
);

export const deleteTeam = createAsyncThunk<void, string, { state: RootState }>(
  "profile/deleteTeam",
  (teamId, { dispatch, getState }) => {
    dispatch(profileSlice.actions.deleteTeamLocal(teamId));
    if (supabase && getState().auth.session?.user.id) {
      void supabase.from("user_teams").delete().eq("id", teamId);
    }
  },
);

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    upsertInventoryEntryLocal(state, action: PayloadAction<InventoryEntry>) {
      const entry = action.payload;
      state.inventory = state.inventory.filter((e) => e.characterId !== entry.characterId);
      if (entry.stars > 0 || entry.copies > 0) state.inventory.push(entry);
    },
    removeInventoryEntryLocal(state, action: PayloadAction<number>) {
      state.inventory = state.inventory.filter((e) => e.characterId !== action.payload);
    },
    saveTeamLocal(state, action: PayloadAction<Team>) {
      state.teams = [...state.teams.filter((t) => t.id !== action.payload.id), action.payload];
    },
    deleteTeamLocal(state, action: PayloadAction<string>) {
      state.teams = state.teams.filter((t) => t.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(syncWithCloud.fulfilled, (state, action) => {
      if (!action.payload) return;
      state.inventory = action.payload.inventory;
      state.teams = action.payload.teams;
      state.syncedUserId = action.meta.arg;
    });
  },
});

export default profileSlice.reducer;
