import { useMemo, useState } from "react";
import { useAppSelector } from "../store/hooks";
import { CharacterCard } from "../components/CharacterCard";
import { CharacterHoverCard } from "../components/CharacterHoverCard";
import { CharacterModal } from "../components/CharacterModal";

const RARITIES = ["LEGEND", "ULTRA", "SPARKING", "EXTREME", "HERO"] as const;

const RARITY_CHIP_STYLE: Record<string, string> = {
  LEGEND: "border-amber-400/60 text-amber-300",
  ULTRA: "border-fuchsia-500/60 text-fuchsia-300",
  SPARKING: "border-sky-400/60 text-sky-300",
  EXTREME: "border-red-500/60 text-red-300",
  HERO: "border-emerald-500/60 text-emerald-300",
};

const COLOR_ORDER = ["RED", "BLU", "GRN", "YEL", "PUR", "LGT", "DRK"];

const COLOR_CHIP_TEXT: Record<string, string> = {
  RED: "border-red-500/60 text-red-300",
  BLU: "border-blue-500/60 text-blue-300",
  GRN: "border-emerald-500/60 text-emerald-300",
  YEL: "border-amber-400/60 text-amber-300",
  PUR: "border-fuchsia-500/60 text-fuchsia-300",
  DRK: "border-slate-400/60 text-slate-300",
  LGT: "border-white/60 text-white",
};

export function InventoryPage() {
  const characters = useAppSelector((s) => s.gameData.characters);
  const loading = useAppSelector((s) => s.gameData.loading);
  const inventory = useAppSelector((s) => s.profile.inventory);
  const [search, setSearch] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [rarities, setRarities] = useState<Set<string>>(new Set());
  const [colors, setColors] = useState<Set<string>>(new Set());
  const [llOnly, setLlOnly] = useState(false);
  const [zenkaiOnly, setZenkaiOnly] = useState(false);
  const [openCharacterId, setOpenCharacterId] = useState<number | null>(null);

  const inventoryByChar = useMemo(() => new Map(inventory.map((e) => [e.characterId, e])), [inventory]);

  const availableColors = useMemo(() => {
    const present = new Set(characters.map((c) => c.color));
    return [...present].sort((a, b) => {
      const ai = COLOR_ORDER.indexOf(a);
      const bi = COLOR_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [characters]);

  function toggleInSet(setter: (fn: (prev: Set<string>) => Set<string>) => void, value: string) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return characters.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.card.toLowerCase().includes(q)) return false;
      if (ownedOnly && !inventoryByChar.has(c.id)) return false;
      if (rarities.size > 0 && !rarities.has(c.rarity)) return false;
      if (colors.size > 0 && !colors.has(c.color)) return false;
      if (llOnly && !c.isLegendsLimited) return false;
      if (zenkaiOnly && !c.isZenkai) return false;
      return true;
    });
  }, [characters, search, ownedOnly, rarities, colors, llOnly, zenkaiOnly, inventoryByChar]);

  const openCharacter = openCharacterId != null ? characters.find((c) => c.id === openCharacterId) : undefined;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
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
          {filtered.length} / {characters.length} angezeigt · {inventory.length} im Inventar
          {loading && " · lade Datenbank…"}
        </span>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        {RARITIES.map((r) => {
          const active = rarities.has(r);
          return (
            <button
              key={r}
              type="button"
              onClick={() => toggleInSet(setRarities, r)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                active ? `${RARITY_CHIP_STYLE[r]} bg-white/10` : "border-white/10 text-white/40 hover:text-white/70"
              }`}
            >
              {r}
            </button>
          );
        })}
        <span className="mx-1 h-4 w-px bg-white/10" />
        <label
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
            llOnly ? "border-amber-400/60 bg-white/10 text-amber-300" : "border-white/10 text-white/40"
          }`}
        >
          <input type="checkbox" className="hidden" checked={llOnly} onChange={(e) => setLlOnly(e.target.checked)} />
          Legends Limited
        </label>
        <label
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
            zenkaiOnly ? "border-red-500/60 bg-white/10 text-red-300" : "border-white/10 text-white/40"
          }`}
        >
          <input
            type="checkbox"
            className="hidden"
            checked={zenkaiOnly}
            onChange={(e) => setZenkaiOnly(e.target.checked)}
          />
          Zenkai
        </label>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {availableColors.map((c) => {
          const active = colors.has(c);
          const style = COLOR_CHIP_TEXT[c] ?? "border-white/20 text-white/60";
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggleInSet(setColors, c)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                active ? `${style} bg-white/10` : "border-white/10 text-white/40 hover:text-white/70"
              }`}
            >
              {c}
            </button>
          );
        })}
        {(rarities.size > 0 || colors.size > 0 || llOnly || zenkaiOnly) && (
          <button
            type="button"
            onClick={() => {
              setRarities(new Set());
              setColors(new Set());
              setLlOnly(false);
              setZenkaiOnly(false);
            }}
            className="text-xs text-white/40 underline hover:text-white/70"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {characters.length === 0 && !loading && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          Keine Charakterdaten gefunden. Führe <code>npm run scrape</code> im Projekt-Root aus, um die Datenbank von
          dblegends.net zu füllen (siehe README).
        </div>
      )}

      <p className="mb-3 text-xs text-white/30">
        Klick auf eine Karte, um sie zum Inventar hinzuzufügen oder zu bearbeiten. 4 Sekunden Hover zeigt eine
        Schnellvorschau.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => {
          const entry = inventoryByChar.get(c.id);
          return (
            <CharacterHoverCard key={c.id} character={c} onClick={(char) => setOpenCharacterId(char.id)}>
              <CharacterCard
                character={c}
                right={
                  entry ? (
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          entry.stars > 7 ? "bg-red-500/20 text-red-400" : "bg-amber-400/20 text-amber-300"
                        }`}
                      >
                        ★ {entry.stars}
                      </span>
                      {c.isZenkai && !entry.isZAwakened && entry.stars >= 7 && (
                        <span
                          title="Kann zenkai-awakened werden"
                          className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300"
                        >
                          ⚡ Zenkai
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="shrink-0 rounded-full border border-dashed border-white/20 px-2 py-1 text-xs text-white/30">
                      + hinzufügen
                    </span>
                  )
                }
              />
            </CharacterHoverCard>
          );
        })}
      </div>

      {openCharacter && <CharacterModal character={openCharacter} onClose={() => setOpenCharacterId(null)} />}
    </div>
  );
}
