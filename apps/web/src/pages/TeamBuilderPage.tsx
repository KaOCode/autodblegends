import { useMemo, useState, type ReactElement } from "react";
import { Button } from "@heroui/react";
import { buildOptimalTeam, type BuiltTeam, type OwnedCharacter, type TeamMode } from "@autodbl/shared";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { deleteTeam, saveTeam } from "../store/profileSlice";
import { CharacterCard } from "../components/CharacterCard";
import { CharacterHoverCard } from "../components/CharacterHoverCard";
import { CharacterModal } from "../components/CharacterModal";
import { StaggerReveal } from "../components/animate-ui/StaggerReveal";
import { SlidingNumber } from "../components/animate-ui/SlidingNumber";

const MODES: { key: TeamMode; label: string }[] = [
  { key: "pvp", label: "PVP" },
  { key: "event", label: "Event" },
  { key: "raid", label: "Raid" },
];

export function TeamBuilderPage() {
  const dispatch = useAppDispatch();
  const characters = useAppSelector((s) => s.gameData.characters);
  const inventory = useAppSelector((s) => s.profile.inventory);
  const savedTeams = useAppSelector((s) => s.profile.teams);
  const [mode, setMode] = useState<TeamMode>("pvp");
  const [eventTagHint, setEventTagHint] = useState("");
  const [result, setResult] = useState<BuiltTeam | null>(null);
  const [teamName, setTeamName] = useState("");
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

  function handleAutoCreate() {
    const built = buildOptimalTeam({ mode, owned, eventTagHint: eventTagHint.trim() || undefined });
    setResult(built);
  }

  function handleSave() {
    if (!result) return;
    const now = new Date().toISOString();
    dispatch(
      saveTeam({
        id: crypto.randomUUID(),
        name: teamName.trim() || `${mode.toUpperCase()} Team ${new Date().toLocaleDateString("de-DE")}`,
        mode: result.mode,
        slots: result.slots,
        supportItemIds: result.suggestedSupportItems.map((s) => s.id),
        createdAt: now,
        updatedAt: now,
      }),
    );
    setTeamName("");
  }

  const charById = new Map(characters.map((c) => [c.id, c]));

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="mb-3 text-sm text-white/60">
          Wähle den Modus, für den das Team gebaut werden soll. Nur Charaktere aus deinem Inventar werden verwendet (
          {owned.length} verfügbar).
        </p>
        <div className="flex gap-1 rounded-full border border-white/10 bg-black/20 p-1 w-fit">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                mode === m.key ? "bg-amber-400 text-black font-semibold" : "text-white/70 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === "event" && (
          <input
            className="mt-4 w-full max-w-sm rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/60"
            placeholder='Event-Tag Hinweis (z.B. "Universe Rep", "Android")'
            value={eventTagHint}
            onChange={(e) => setEventTagHint(e.target.value)}
          />
        )}

        <div className="mt-4">
          <Button isDisabled={owned.length === 0} onPress={handleAutoCreate}>
            ⚡ Auto Create
          </Button>
          {owned.length === 0 && (
            <p className="mt-2 text-xs text-white/40">Füge zuerst Charaktere in deinem Inventar hinzu.</p>
          )}
        </div>
      </div>

      {savedTeams.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-white">Gespeicherte Teams ({savedTeams.length})</h2>
          <div className="space-y-2">
            {[...savedTeams]
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((team) => (
                <div
                  key={team.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="min-w-[10rem]">
                    <p className="text-sm font-semibold text-white">{team.name}</p>
                    <p className="text-xs text-white/40">
                      {MODES.find((m) => m.key === team.mode)?.label ?? team.mode} ·{" "}
                      {new Date(team.createdAt).toLocaleDateString("de-DE")}
                    </p>
                  </div>
                  <div className="flex flex-1 flex-wrap gap-1">
                    {team.slots.map((slot) => {
                      const character = charById.get(slot.characterId);
                      if (!character) return null;
                      return (
                        <button
                          key={slot.characterId}
                          type="button"
                          onClick={() => setOpenCharacterId(character.id)}
                          title={character.name}
                          className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border ${
                            slot.isLeader ? "border-amber-400" : "border-white/10"
                          }`}
                        >
                          <img
                            src={`https://dblegends.net/assets/card_icons/BChaIco_${character.img}.webp`}
                            alt={character.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      );
                    })}
                  </div>
                  <Button size="sm" variant="danger-soft" onPress={() => dispatch(deleteTeam(team.id))}>
                    Löschen
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}

      {result && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Vorgeschlagenes Team · Score <SlidingNumber value={result.score} className="text-amber-400" />
            </h2>
            <div className="flex items-center gap-2">
              <input
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none"
                placeholder="Team-Name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
              <Button size="sm" variant="outline" onPress={handleSave}>
                Team speichern
              </Button>
            </div>
          </div>

          <StaggerReveal className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.slots
              .map((slot) => {
                const character = charById.get(slot.characterId);
                if (!character) return null;
                return (
                  <CharacterHoverCard
                    key={slot.characterId}
                    character={character}
                    onClick={(char) => setOpenCharacterId(char.id)}
                  >
                    <CharacterCard character={character} isLeader={slot.isLeader} />
                  </CharacterHoverCard>
                );
              })
              .filter((v): v is ReactElement => v !== null)}
          </StaggerReveal>

          {result.suggestedSupportItems.length > 0 && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="mb-2 text-sm font-semibold text-white/80">
                Support-Item-Vorschläge <span className="text-white/40">(optional, Best-Effort)</span>
              </p>
              <ul className="space-y-1 text-sm text-white/60">
                {result.suggestedSupportItems.map((item) => (
                  <li key={item.id}>
                    <span className="text-white/80">{item.name}:</span> {item.effectSummary}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="mb-2 text-sm font-semibold text-white/80">Begründung</p>
            <ul className="list-inside list-disc space-y-1 text-xs text-white/50">
              {result.reasoning.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {openCharacterId != null && charById.get(openCharacterId) && (
        <CharacterModal character={charById.get(openCharacterId)!} onClose={() => setOpenCharacterId(null)} />
      )}
    </div>
  );
}
