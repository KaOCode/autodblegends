import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  buildOptimalTeam,
  deriveEventTagHints,
  suggestCharactersForEvent,
  type BuiltTeam,
  type DblEvent,
  type OwnedCharacter,
} from "@autodbl/shared";
import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { saveTeam } from "../store/profileSlice";
import { GameImage } from "./GameImage";
import { CharacterCard } from "./CharacterCard";
import { StaggerReveal } from "./animate-ui/StaggerReveal";
import { SlidingNumber } from "./animate-ui/SlidingNumber";

export function EventModal({
  event,
  onClose,
  onOpenCharacter,
}: {
  event: DblEvent;
  onClose: () => void;
  onOpenCharacter: (characterId: number) => void;
}) {
  const dispatch = useAppDispatch();
  const characters = useAppSelector((s) => s.gameData.characters);
  const inventory = useAppSelector((s) => s.profile.inventory);
  const [builtTeam, setBuiltTeam] = useState<BuiltTeam | null>(null);
  const [teamName, setTeamName] = useState("");

  const owned: OwnedCharacter[] = useMemo(() => {
    const charById = new Map(characters.map((c) => [c.id, c]));
    return inventory
      .filter((e) => e.stars > 0)
      .map((inv) => {
        const character = charById.get(inv.characterId);
        return character ? { character, inventory: inv } : null;
      })
      .filter((v): v is OwnedCharacter => v !== null);
  }, [characters, inventory]);

  const suggestions = useMemo(() => suggestCharactersForEvent(event, owned), [event, owned]);
  const charById = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]);

  function handleBuildTeam() {
    const eventTagHints = deriveEventTagHints(event, characters);
    setBuiltTeam(buildOptimalTeam({ mode: "event", owned, eventTagHints }));
  }

  function handleSaveTeam() {
    if (!builtTeam) return;
    const now = new Date().toISOString();
    dispatch(
      saveTeam({
        id: crypto.randomUUID(),
        name: teamName.trim() || event.name,
        mode: builtTeam.mode,
        slots: builtTeam.slots,
        supportItemIds: builtTeam.suggestedSupportItems.map((s) => s.id),
        createdAt: now,
        updatedAt: now,
      }),
    );
    setTeamName("");
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
          <GameImage
            base={`https://dblegends.net/assets/events/${event.img}`}
            alt={event.name}
            className="mb-4 h-40 w-full rounded-xl object-cover"
          />
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{event.name}</h2>
              <p className="text-xs text-white/40">
                {new Date(event.beginsAt).toLocaleString("de-DE")} – {new Date(event.endsAt).toLocaleString("de-DE")}
              </p>
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

          <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white/80">Team für dieses Event</p>
              {owned.length > 0 && (
                <button
                  type="button"
                  onClick={handleBuildTeam}
                  className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-300"
                >
                  ⚡ Team automatisch bauen
                </button>
              )}
            </div>

            {owned.length === 0 && (
              <p className="text-xs text-white/40">Füge zuerst Charaktere zu deinem Inventar hinzu.</p>
            )}

            {builtTeam && (
              <div>
                <p className="mb-2 text-xs text-white/50">
                  Score <SlidingNumber value={builtTeam.score} className="text-amber-400" />
                </p>
                <StaggerReveal className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {builtTeam.slots.map((slot) => {
                    const character = charById.get(slot.characterId);
                    if (!character) return null;
                    return (
                      <div key={slot.characterId} onClick={() => onOpenCharacter(slot.characterId)} className="cursor-pointer">
                        <CharacterCard character={character} isLeader={slot.isLeader} />
                      </div>
                    );
                  })}
                </StaggerReveal>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-white outline-none"
                    placeholder={event.name}
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleSaveTeam}
                    className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:text-white"
                  >
                    Team speichern
                  </button>
                </div>
              </div>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-300/80">
                Einzeln empfohlen aus deinem Inventar
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {suggestions.map(({ character, matchedHints }) => (
                  <button
                    key={character.character.id}
                    type="button"
                    onClick={() => onOpenCharacter(character.character.id)}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2 text-left transition-colors hover:border-amber-400/40 hover:bg-white/10"
                  >
                    <img
                      src={`https://dblegends.net/assets/card_icons/BChaIco_${character.character.img}.webp`}
                      alt={character.character.name}
                      className="h-10 w-10 rounded-md object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{character.character.name}</p>
                      <p className="truncate text-xs text-white/40">
                        {matchedHints.length > 0 ? `Passt zu: ${matchedHints.join(", ")}` : "Stärkster Charakter"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!event.difficulties || event.difficulties.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/50">
              Für dieses Event wurden keine Stage-Details geladen (nur für aktive/anstehende Events beim Scrape
              erfasst). Details direkt auf{" "}
              <a
                href={`https://dblegends.net/event/${event.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-amber-300 underline"
              >
                dblegends.net
              </a>
              .
            </div>
          ) : (
            <div className="space-y-4">
              {event.difficulties.map((diff) => (
                <div key={diff.index}>
                  {event.difficulties!.length > 1 && (
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-300/80">
                      Schwierigkeit {diff.index + 1}
                    </p>
                  )}
                  <div className="space-y-2">
                    {diff.stages.map((stage, i) => (
                      <details key={i} className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <summary className="flex cursor-pointer items-center justify-between text-sm text-white">
                          <span>
                            {stage.name}
                            {stage.enemies[0]?.level ? (
                              <span className="ml-2 text-xs text-white/40">Lv {stage.enemies[0].level}</span>
                            ) : null}
                          </span>
                          {stage.stamina != null && (
                            <span className="text-xs text-white/40">Stamina {stage.stamina}</span>
                          )}
                        </summary>
                        <div className="mt-3 space-y-2 text-xs text-white/60">
                          {stage.enemies.length > 0 && (
                            <p>
                              <span className="text-white/40">Gegner: </span>
                              {stage.enemies.map((e) => e.name).join(", ")}
                            </p>
                          )}
                          {(stage.exp || stage.zeni) && (
                            <p>
                              <span className="text-white/40">Belohnung: </span>
                              {stage.exp && `EXP ${stage.exp}`} {stage.zeni && `· Zeni ${stage.zeni}`}
                            </p>
                          )}
                          {stage.firstClearDrops.length > 0 && (
                            <p>
                              <span className="text-white/40">Erstclear: </span>
                              {stage.firstClearDrops.map((d) => `${d.name} ${d.qty}`).join(", ")}
                            </p>
                          )}
                          {stage.challenges.length > 0 && (
                            <div>
                              <p className="text-white/40">Challenges:</p>
                              <ul className="ml-4 list-disc">
                                {stage.challenges.map((c, ci) => (
                                  <li key={ci}>{c.text}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
