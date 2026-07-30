import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { Character } from "@autodbl/shared";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { removeInventoryEntry, upsertInventoryEntry } from "../store/profileSlice";
import { StarPicker } from "./StarPicker";
import { NumberStepper } from "./NumberStepper";
import { CharacterDetailCard } from "./CharacterDetailCard";

export function CharacterModal({ character, onClose }: { character: Character; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const entry = useAppSelector((s) => s.profile.inventory.find((e) => e.characterId === character.id));
  const owned = Boolean(entry);

  const [stars, setStars] = useState(entry?.stars ?? 0);
  const [level, setLevel] = useState(entry?.level ?? 5000);
  const [isZAwakened, setIsZAwakened] = useState(entry?.isZAwakened ?? false);

  useEffect(() => {
    setStars(entry?.stars ?? 0);
    setLevel(entry?.level ?? 5000);
    setIsZAwakened(entry?.isZAwakened ?? false);
  }, [entry, character.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function persist(next: Partial<{ stars: number; level: number; isZAwakened: boolean }>) {
    const merged = { stars, level, isZAwakened, ...next };
    setStars(merged.stars);
    setLevel(merged.level);
    setIsZAwakened(merged.isZAwakened);
    if (merged.stars > 0) {
      dispatch(upsertInventoryEntry({ characterId: character.id, ...merged }));
    }
  }

  function handleAdd() {
    persist({ stars: stars > 0 ? stars : 1 });
  }

  function handleRemove() {
    dispatch(removeInventoryEntry(character.id));
    onClose();
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1020] p-5"
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{character.name}</h2>
              <p className="text-xs text-white/40">{character.card}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
              aria-label="Schließen"
            >
              ✕
            </button>
          </div>

          <div className="mb-5">
            <CharacterDetailCard character={character} />
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white/80">Dein Inventar</p>
              <span className={`text-xs ${owned ? "text-emerald-400" : "text-white/40"}`}>
                {owned ? "Im Besitz" : "Nicht im Besitz"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-white/50">Sterne</p>
                <StarPicker value={stars} onChange={(v) => persist({ stars: v })} />
              </div>
              <div>
                <p className="mb-1 text-xs text-white/50">Level</p>
                <NumberStepper value={level} min={1} max={9999} step={1} onChange={(v) => persist({ level: v })} />
              </div>
            </div>

            {character.isZenkai && !isZAwakened && (
              <p className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                ⚡ Kann zenkai-awakened werden – prüfe im "Events &amp; Banner"-Tab, ob das Zenkai-Banner gerade
                verfügbar ist.
              </p>
            )}
            <label className="mt-4 flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={isZAwakened}
                onChange={(e) => persist({ isZAwakened: e.target.checked })}
              />
              Bereits Z-Awakened
            </label>

            <div className="mt-4 flex gap-2">
              {!owned && (
                <button
                  type="button"
                  onClick={handleAdd}
                  className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300"
                >
                  Zum Inventar hinzufügen
                </button>
              )}
              {owned && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20"
                >
                  Aus Inventar entfernen
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="ml-auto rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white"
              >
                Fertig
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
