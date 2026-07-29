import { useMemo, useState } from "react";
import { Chip } from "@heroui/react";
import { useApp } from "../lib/AppContext";
import { StarPicker } from "../components/StarPicker";

export function InventoryPage() {
  const { characters, loading, inventory, upsertInventoryEntry } = useApp();
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => {
          const entry = inventoryByChar.get(c.id);
          return (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <img
                src={`https://dblegends.net/assets/card_icons/BChaIco_${c.img}.webp`}
                alt={c.name}
                className="h-14 w-14 rounded-lg object-cover"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                <p className="truncate text-xs text-white/50">{c.card}</p>
                <Chip size="sm" color={c.rarity === "LEGEND" ? "warning" : "default"}>
                  <Chip.Label>{c.rarity}</Chip.Label>
                </Chip>
                <div className="mt-1">
                  <StarPicker
                    value={entry?.stars ?? 0}
                    onChange={(stars) =>
                      upsertInventoryEntry({
                        characterId: c.id,
                        stars,
                        level: entry?.level ?? 1,
                        isZAwakened: entry?.isZAwakened ?? false,
                        copies: stars > 0 ? Math.max(1, entry?.copies ?? 1) : 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
