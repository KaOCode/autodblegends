import { useMemo, useState } from "react";
import { Chip } from "@heroui/react";
import { matchEventToOwnedCharacters, rankBannerPriority, type OwnedCharacter } from "@autodbl/shared";
import { useAppSelector } from "../store/hooks";
import { EventModal } from "../components/EventModal";
import { CharacterModal } from "../components/CharacterModal";

const PRIORITY_STYLE: Record<string, string> = {
  high: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
  medium: "border-amber-400/50 bg-amber-400/10 text-amber-300",
  low: "border-white/10 bg-white/5 text-white/40",
};

export function EventsPage() {
  const characters = useAppSelector((s) => s.gameData.characters);
  const events = useAppSelector((s) => s.gameData.events);
  const banners = useAppSelector((s) => s.gameData.banners);
  const inventory = useAppSelector((s) => s.profile.inventory);
  const [openEventId, setOpenEventId] = useState<number | null>(null);
  const [openCharacterId, setOpenCharacterId] = useState<number | null>(null);

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

  const activeEvents = useMemo(() => events.filter((e) => e.status === "active"), [events]);

  const bannerRanking = useMemo(() => {
    const upcoming = banners.filter((b) => new Date(b.endsAt).getTime() > Date.now());
    return upcoming
      .map((b) => rankBannerPriority(b, characters, owned))
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 } as const;
        return order[a.priority] - order[b.priority];
      })
      .slice(0, 30);
  }, [banners, characters, owned]);

  const openEvent = openEventId != null ? events.find((e) => e.id === openEventId) : undefined;
  const openCharacter = openCharacterId != null ? characters.find((c) => c.id === openCharacterId) : undefined;

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Aktive Events ({activeEvents.length})</h2>
        <p className="mb-3 text-xs text-white/30">Klick auf ein Event für Stages, Gegner &amp; Belohnungen.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {activeEvents.map((event) => {
            const matches = matchEventToOwnedCharacters(event, owned);
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => setOpenEventId(event.id)}
                className="rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:border-amber-400/40 hover:bg-white/10"
              >
                <p className="text-sm font-semibold text-white">{event.name}</p>
                <p className="text-xs text-white/40">
                  bis {new Date(event.endsAt).toLocaleDateString("de-DE")}
                </p>
                {matches.length > 0 ? (
                  <p className="mt-2 text-xs text-emerald-300">
                    Du besitzt passende Charaktere:{" "}
                    {matches.map((m, i) => (
                      <span key={m.character.id}>
                        {i > 0 && ", "}
                        <span
                          role="link"
                          className="underline decoration-dotted hover:text-emerald-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenCharacterId(m.character.id);
                          }}
                        >
                          {m.character.name}
                        </span>
                      </span>
                    ))}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-white/30">Kein direkter Charakter-Treffer erkannt.</p>
                )}
              </button>
            );
          })}
          {activeEvents.length === 0 && (
            <p className="text-sm text-white/40">Keine aktiven Events in den geladenen Daten.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold text-white">Banner-Prioritäten</h2>
        <p className="mb-3 text-xs text-white/40">
          Best-Effort-Einschätzung basierend auf erkanntem Charakter im Banner-Namen, Seltenheit und deinem Inventar.
        </p>
        <div className="space-y-2">
          {bannerRanking.map(({ banner, priority, reason }) => (
            <div
              key={banner.id}
              className={`flex items-center justify-between rounded-lg border p-3 text-sm ${PRIORITY_STYLE[priority]}`}
            >
              <div>
                <p className="font-medium">{banner.name}</p>
                <p className="text-xs opacity-70">{reason}</p>
              </div>
              <Chip size="sm" color={priority === "high" ? "success" : priority === "medium" ? "warning" : "default"}>
                <Chip.Label>{priority}</Chip.Label>
              </Chip>
            </div>
          ))}
          {bannerRanking.length === 0 && <p className="text-sm text-white/40">Keine Banner-Daten geladen.</p>}
        </div>
      </section>

      {openEvent && <EventModal event={openEvent} onClose={() => setOpenEventId(null)} />}
      {openCharacter && <CharacterModal character={openCharacter} onClose={() => setOpenCharacterId(null)} />}
    </div>
  );
}
