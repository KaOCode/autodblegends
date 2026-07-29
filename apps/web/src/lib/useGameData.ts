import { useEffect, useState } from "react";
import type { Banner, Character, CharacterDb, DblEvent } from "@autodbl/shared";

interface GameData {
  characters: Character[];
  events: DblEvent[];
  banners: Banner[];
  fetchedAt: string | null;
  loading: boolean;
  error: string | null;
}

/** Reads the scraper's cached snapshot (apps/web/public/data/*.json, synced
 * from the repo-level data/ dir via `npm run sync-data`). Swap this for a
 * Supabase query once a project has cloud sync configured and the scraper
 * is pushing there instead of/in addition to the local JSON files. */
export function useGameData(): GameData {
  const [state, setState] = useState<GameData>({
    characters: [],
    events: [],
    banners: [],
    fetchedAt: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [charRes, eventRes, bannerRes] = await Promise.all([
          fetch("/data/characters.json"),
          fetch("/data/events.json"),
          fetch("/data/banners.json"),
        ]);
        const charDb = (await charRes.json()) as CharacterDb;
        const eventDb = (await eventRes.json()) as { events: DblEvent[]; fetchedAt: string };
        const bannerDb = (await bannerRes.json()) as { banners: Banner[]; fetchedAt: string };
        if (cancelled) return;
        setState({
          characters: charDb.characters,
          events: eventDb.events,
          banners: bannerDb.banners,
          fetchedAt: charDb.fetchedAt,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
