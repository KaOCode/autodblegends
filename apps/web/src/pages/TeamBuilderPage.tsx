import { useMemo, useState, type ReactElement } from "react";
import { Button } from "@heroui/react";
import { buildOptimalTeam, type BuiltTeam, type OwnedCharacter, type TeamMode } from "@autodbl/shared";
import { useApp } from "../lib/AppContext";
import { CharacterCard } from "../components/CharacterCard";
import { StaggerReveal } from "../components/animate-ui/StaggerReveal";
import { SlidingNumber } from "../components/animate-ui/SlidingNumber";

const MODES: { key: TeamMode; label: string }[] = [
  { key: "pvp", label: "PVP" },
  { key: "event", label: "Event" },
  { key: "raid", label: "Raid" },
];

export function TeamBuilderPage() {
  const { characters, inventory, saveTeam } = useApp();
  const [mode, setMode] = useState<TeamMode>("pvp");
  const [eventTagHint, setEventTagHint] = useState("");
  const [result, setResult] = useState<BuiltTeam | null>(null);
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

  function handleAutoCreate() {
    const built = buildOptimalTeam({ mode, owned, eventTagHint: eventTagHint.trim() || undefined });
    setResult(built);
  }

  function handleSave() {
    if (!result) return;
    const now = new Date().toISOString();
    saveTeam({
      id: crypto.randomUUID(),
      name: teamName.trim() || `${mode.toUpperCase()} Team ${new Date().toLocaleDateString("de-DE")}`,
      mode: result.mode,
      slots: result.slots,
      supportItemIds: result.suggestedSupportItems.map((s) => s.id),
      createdAt: now,
      updatedAt: now,
    });
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
                return <CharacterCard key={slot.characterId} character={character} isLeader={slot.isLeader} />;
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
    </div>
  );
}
