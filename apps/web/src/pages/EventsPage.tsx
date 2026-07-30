import { useMemo, useState } from "react";
import { Chip } from "@heroui/react";
import {
  findZenkaiReadyCharacters,
  matchEventToOwnedCharacters,
  rankBannerPriority,
  type OwnedCharacter,
} from "@autodbl/shared";
import { useAppSelector } from "../store/hooks";
import { EventModal } from "../components/EventModal";
import { CharacterModal } from "../components/CharacterModal";
import { BannerModal } from "../components/BannerModal";
import { GameImage } from "../components/GameImage";

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
  const teams = useAppSelector((s) => s.profile.teams);
  const [openEventId, setOpenEventId] = useState<number | null>(null);
  const [openCharacterId, setOpenCharacterId] = useState<number | null>(null);
  const [openBannerId, setOpenBannerId] = useState<number | null>(null);

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

  const zenkaiReady = useMemo(() => findZenkaiReadyCharacters(owned, banners, teams), [owned, banners, teams]);

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
  const openBanner = openBannerId != null ? banners.find((b) => b.id === openBannerId) : undefined;
  const openBannerFeaturedCharacters = useMemo(() => {
    if (!openBanner) return [];
    return characters.filter((c) =>
      openBanner.guessedFeaturedCharacterNames.some((n) => n.toLowerCase() === c.name.toLowerCase()),
    );
  }, [openBanner, characters]);

  return (
    <div className="space-y-10">
      {zenkaiReady.length > 0 && (
        <section>
          <h2 className="mb-1 text-lg font-semibold text-white">Zenkai-Priorität ({zenkaiReady.length})</h2>
          <p className="mb-3 text-xs text-white/40">
            Wenn in der Tauschbörse mal wieder ein Zenkai-Awakening-Item verfügbar ist: hier ist die Reihenfolge, in
            der es sich für deine Charaktere am meisten lohnt (Stärke, eigener Leader Skill, Nutzung in gespeicherten
            Teams, gerade laufendes Zenkai-Banner). Grün = das passende Banner ist zusätzlich gerade live.
          </p>
          <div className="space-y-2">
            {zenkaiReady.map(({ character, banner, reasons }, i) => (
              <button
                key={character.character.id}
                type="button"
                onClick={() => (banner ? setOpenBannerId(banner.id) : setOpenCharacterId(character.character.id))}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-opacity hover:opacity-80 ${
                  banner
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-white/5 text-white/60"
                }`}
              >
                <span className="w-6 shrink-0 text-center text-xs font-bold text-white/30">#{i + 1}</span>
                <img
                  src={`https://dblegends.net/assets/card_icons/BChaIco_${character.character.img}.webp`}
                  alt={character.character.name}
                  className="h-10 w-10 shrink-0 rounded-md object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{character.character.name}</p>
                  <p className="truncate text-xs opacity-70">
                    {reasons.length > 0 ? reasons.join(" · ") : "Solide Basis-Empfehlung"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

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
                className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:border-amber-400/40 hover:bg-white/10"
              >
                <GameImage
                  base={`https://dblegends.net/assets/events/${event.img}`}
                  alt={event.name}
                  className="h-14 w-24 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0">
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
                </div>
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
            <button
              key={banner.id}
              type="button"
              onClick={() => setOpenBannerId(banner.id)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-opacity hover:opacity-80 ${PRIORITY_STYLE[priority]}`}
            >
              <GameImage
                base={`https://dblegends.net/assets/gasha/${banner.img}`}
                alt={banner.name}
                className="h-12 w-20 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{banner.name}</p>
                <p className="truncate text-xs opacity-70">{reason}</p>
              </div>
              <Chip size="sm" color={priority === "high" ? "success" : priority === "medium" ? "warning" : "default"}>
                <Chip.Label>{priority}</Chip.Label>
              </Chip>
            </button>
          ))}
          {bannerRanking.length === 0 && <p className="text-sm text-white/40">Keine Banner-Daten geladen.</p>}
        </div>
      </section>

      {openEvent && (
        <EventModal
          event={openEvent}
          onClose={() => setOpenEventId(null)}
          onOpenCharacter={(id) => {
            setOpenEventId(null);
            setOpenCharacterId(id);
          }}
        />
      )}
      {openCharacter && <CharacterModal character={openCharacter} onClose={() => setOpenCharacterId(null)} />}
      {openBanner && (
        <BannerModal
          banner={openBanner}
          featuredCharacters={openBannerFeaturedCharacters}
          onClose={() => setOpenBannerId(null)}
          onOpenCharacter={(id) => {
            setOpenBannerId(null);
            setOpenCharacterId(id);
          }}
        />
      )}
    </div>
  );
}
