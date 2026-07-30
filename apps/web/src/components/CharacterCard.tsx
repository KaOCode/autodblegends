import type { ReactNode } from "react";
import type { Character } from "@autodbl/shared";
import { Chip } from "@heroui/react";

export const COLOR_STYLES: Record<string, string> = {
  RED: "border-red-500/60 bg-red-500/10",
  BLU: "border-blue-500/60 bg-blue-500/10",
  GRN: "border-emerald-500/60 bg-emerald-500/10",
  YEL: "border-amber-400/60 bg-amber-400/10",
  PUR: "border-fuchsia-500/60 bg-fuchsia-500/10",
  DRK: "border-slate-400/60 bg-slate-400/10",
  LGT: "border-white/60 bg-white/10",
};

export function CharacterCard({
  character,
  isLeader,
  right,
}: {
  character: Character;
  isLeader?: boolean;
  right?: ReactNode;
}) {
  const colorClass = COLOR_STYLES[character.color] ?? "border-white/20 bg-white/5";

  return (
    <div className={`relative flex items-center gap-3 rounded-xl border p-3 ${colorClass}`}>
      {isLeader && (
        <span className="absolute -top-2 -left-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-black">
          LEADER
        </span>
      )}
      <img
        src={`https://dblegends.net/assets/card_icons/BChaIco_${character.img}.webp`}
        alt={character.name}
        className="h-14 w-14 rounded-lg object-cover"
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{character.name}</p>
        <p className="truncate text-xs text-white/50">{character.card}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          <Chip size="sm" color={character.rarity === "LEGEND" ? "warning" : "default"}>
            <Chip.Label>{character.rarity}</Chip.Label>
          </Chip>
          {character.isZenkai && (
            <Chip size="sm" color="danger">
              <Chip.Label>Zenkai</Chip.Label>
            </Chip>
          )}
        </div>
      </div>
      {right}
    </div>
  );
}
