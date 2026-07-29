import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { Banner, Character, CharacterDb, DblEvent } from "@autodbl/shared";

interface GameDataState {
  characters: Character[];
  events: DblEvent[];
  banners: Banner[];
  fetchedAt: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: GameDataState = {
  characters: [],
  events: [],
  banners: [],
  fetchedAt: null,
  loading: true,
  error: null,
};

/** Reads the scraper's cached snapshot (apps/web/public/data/*.json, synced
 * from the repo-level data/ dir via `npm run sync-data`). Swap this for a
 * Supabase query once a project pushes the scraper's output there instead
 * of/in addition to the local JSON files. */
export const fetchGameData = createAsyncThunk("gameData/fetch", async () => {
  const [charRes, eventRes, bannerRes] = await Promise.all([
    fetch("/data/characters.json"),
    fetch("/data/events.json"),
    fetch("/data/banners.json"),
  ]);
  const charDb = (await charRes.json()) as CharacterDb;
  const eventDb = (await eventRes.json()) as { events: DblEvent[] };
  const bannerDb = (await bannerRes.json()) as { banners: Banner[] };
  return {
    characters: charDb.characters,
    events: eventDb.events,
    banners: bannerDb.banners,
    fetchedAt: charDb.fetchedAt,
  };
});

const gameDataSlice = createSlice({
  name: "gameData",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGameData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGameData.fulfilled, (state, action) => {
        state.characters = action.payload.characters;
        state.events = action.payload.events;
        state.banners = action.payload.banners;
        state.fetchedAt = action.payload.fetchedAt;
        state.loading = false;
      })
      .addCase(fetchGameData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Unbekannter Fehler beim Laden der Datenbank";
      });
  },
});

export default gameDataSlice.reducer;
