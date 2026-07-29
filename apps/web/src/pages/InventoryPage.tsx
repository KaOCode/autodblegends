import { useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { upsertInventoryEntry } from "../store/profileSlice";
import { StarPicker } from "../components/StarPicker";
import { CharacterCard } from "../components/CharacterCard";
import { CharacterHoverCard } from "../components/CharacterHoverCard";

export function InventoryPage() {
  const dispatch = useAppDispatch();
  const characters = useAppSelector((s) => s.gameData.characters);
  const loading = useAppSelector((s) => s.gameData.loading);
  const inventory = useAppSelector((s) => s.profile.inventory);
  const [search, setSearch] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);

  const inventoryByChar = useMemo(() => new Map(inventory.map((e) => [e.characterId, e])), [inventory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return characters.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.card.toLowerCase().includes(q)) return false;
      if (ownedOnly && !inventoryByChar.has(c.id)) return false;
      return true;
    });
  }, [characters, search, ownedOnly, inventoryByChar]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="w-64 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/60"
          placeholder="Charakter suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={ownedOnly} onChange={(e) => setOwnedOnly(e.target.checked)} />
          Nur besessene
        </label>
        <span className="ml-auto text-xs text-white/40">
          {inventory.length} / {characters.length} im Inventar
          {loading && " · lade Datenbank…"}
        </span>
      </div>

      {characters.length === 0 && !loading && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          Keine Charakterdaten gefunden. Führe <code>npm run scrape</code> im Projekt-Root aus, um die Datenbank von
          dblegends.net zu füllen (siehe README).
        </div>
      )}

      <p className="mb-3 text-xs text-white/30">Tipp: 4 Sekunden über einer Karte verweilen zeigt Fähigkeiten &amp; Zugehörigkeit.</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => {
          const entry = inventoryByChar.get(c.id);
          return (
            <CharacterHoverCard key={c.id} character={c}>
              <CharacterCard
                character={c}
                right={
                  <StarPicker
                    value={entry?.stars ?? 0}
                    onChange={(stars) =>
                      dispatch(
                        upsertInventoryEntry({
                          characterId: c.id,
                          stars,
                          level: entry?.level ?? 1,
                          isZAwakened: entry?.isZAwakened ?? false,
                          copies: stars > 0 ? Math.max(1, entry?.copies ?? 1) : 0,
                        }),
                      )
                    }
                  />
                }
              />
            </CharacterHoverCard>
          );
        })}
      </div>
    </div>
  );
}
