import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { InventoryEntry, Team } from "@autodbl/shared";
import { supabase } from "./supabaseClient";
import { loadInventory, loadTeams, saveInventory, saveTeams } from "./storage";

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

/** newest-wins merge by updatedAt, used both directions between local and cloud */
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

export function useProfile(session: Session | null) {
  const [inventory, setInventory] = useState<InventoryEntry[]>(() => loadInventory());
  const [teams, setTeams] = useState<Team[]>(() => loadTeams());
  const syncedForUser = useRef<string | null>(null);

  useEffect(() => {
    saveInventory(inventory);
  }, [inventory]);

  useEffect(() => {
    saveTeams(teams);
  }, [teams]);

  useEffect(() => {
    if (!supabase || !session?.user || syncedForUser.current === session.user.id) return;
    const userId = session.user.id;
    syncedForUser.current = userId;

    (async () => {
      const [{ data: cloudInv }, { data: cloudTeams }] = await Promise.all([
        supabase.from("user_inventory").select("*").eq("user_id", userId),
        supabase.from("user_teams").select("*").eq("user_id", userId),
      ]);

      const mergedInventory = mergeByUpdatedAt(
        inventory,
        (cloudInv ?? []).map(fromCloudInventory),
        (x) => String(x.characterId),
      );
      const mergedTeams = mergeByUpdatedAt(teams, (cloudTeams ?? []).map(fromCloudTeam), (x) => x.id);

      setInventory(mergedInventory);
      setTeams(mergedTeams);

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
    })().catch((err) => console.error("Cloud sync failed", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const pushInventoryEntry = useCallback(
    (entry: InventoryEntry) => {
      if (!supabase || !session?.user) return;
      void supabase.from("user_inventory").upsert({
        user_id: session.user.id,
        character_id: entry.characterId,
        stars: entry.stars,
        level: entry.level,
        is_z_awakened: entry.isZAwakened,
        copies: entry.copies,
        updated_at: entry.updatedAt,
      });
    },
    [session?.user],
  );

  const upsertInventoryEntry = useCallback(
    (entry: Omit<InventoryEntry, "updatedAt">) => {
      const withTimestamp: InventoryEntry = { ...entry, updatedAt: new Date().toISOString() };
      setInventory((prev) => {
        const next = prev.filter((e) => e.characterId !== entry.characterId);
        if (entry.stars > 0 || entry.copies > 0) next.push(withTimestamp);
        return next;
      });
      pushInventoryEntry(withTimestamp);
    },
    [pushInventoryEntry],
  );

  const removeInventoryEntry = useCallback((characterId: number) => {
    setInventory((prev) => prev.filter((e) => e.characterId !== characterId));
    if (supabase && session?.user) {
      void supabase.from("user_inventory").delete().eq("user_id", session.user.id).eq("character_id", characterId);
    }
  }, [session?.user]);

  const saveTeam = useCallback(
    (team: Team) => {
      setTeams((prev) => [...prev.filter((t) => t.id !== team.id), team]);
      if (supabase && session?.user) {
        void supabase.from("user_teams").upsert({
          id: team.id,
          user_id: session.user.id,
          name: team.name,
          mode: team.mode,
          slots: team.slots,
          support_item_ids: team.supportItemIds,
          created_at: team.createdAt,
          updated_at: team.updatedAt,
        });
      }
    },
    [session?.user],
  );

  const deleteTeam = useCallback((teamId: string) => {
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
    if (supabase && session?.user) {
      void supabase.from("user_teams").delete().eq("id", teamId);
    }
  }, [session?.user]);

  return {
    inventory,
    teams,
    upsertInventoryEntry,
    removeInventoryEntry,
    saveTeam,
    deleteTeam,
    setInventory,
    setTeams,
  };
}
