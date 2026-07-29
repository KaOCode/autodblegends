import type { AbilityText, Character } from "@autodbl/shared";
import { motion } from "framer-motion";

const COLOR_GRADIENT: Record<string, string> = {
  RED: "from-red-500 via-rose-400 to-orange-300",
  BLU: "from-blue-500 via-sky-400 to-cyan-300",
  GRN: "from-emerald-500 via-green-400 to-lime-300",
  YEL: "from-amber-400 via-yellow-300 to-orange-200",
  PUR: "from-fuchsia-500 via-purple-400 to-violet-300",
};

const RARITY_LABEL: Record<string, string> = {
  LEGEND: "LEGEND",
  ULTRA: "ULTRA",
  SPARKING: "SPARKING",
  EXTREME: "EXTREME",
  HERO: "HERO",
};

function AbilityBlock({ label, ability }: { label: string; ability?: AbilityText }) {
  if (!ability) return null;
  return (
    <div className="mb-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">{label}</p>
      {ability.title && <p className="text-xs font-semibold text-white">{ability.title}</p>}
      <p className="whitespace-pre-line text-[11px] leading-snug text-white/70">{ability.body}</p>
    </div>
  );
}

/** "Sorare-style" trading card: glossy foil border + full-bleed portrait art
 * up top, scrollable ability/affiliation panel below - the 4s long-hover
 * payoff (see useLongHover). */
export function CharacterDetailCard({ character }: { character: Character }) {
  const gradient = COLOR_GRADIENT[character.color] ?? "from-white/40 via-white/20 to-white/10";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`relative flex w-[420px] overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-[2px] shadow-2xl`}
    >
      {/* holographic sweep */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-tr from-transparent via-white/40 to-transparent"
        initial={{ x: "-120%", opacity: 0 }}
        animate={{ x: "120%", opacity: [0, 0.6, 0] }}
        transition={{ duration: 1.1, ease: "easeInOut" }}
        style={{ mixBlendMode: "overlay" }}
      />

      <div className="flex w-full overflow-hidden rounded-[14px] bg-[#0d1020]">
        <div className="relative w-[150px] shrink-0">
          <img
            src={`https://dblegends.net/assets/card_m_icons/MChaIco_${character.img}.webp`}
            alt={character.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent" />
          <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
            {RARITY_LABEL[character.rarity] ?? character.rarity}
          </span>
        </div>

        <div className="flex max-h-[380px] min-w-0 flex-1 flex-col overflow-y-auto p-3">
          <p className="truncate text-sm font-bold text-white">{character.name}</p>
          <p className="mb-2 truncate text-[10px] text-white/40">{character.card}</p>

          {character.tags.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Zugehörigkeit</p>
              <div className="flex flex-wrap gap-1">
                {character.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <AbilityBlock label="Leader Skill" ability={character.leaderSkill} />
          <AbilityBlock label="Main Ability" ability={character.mainAbility} />
          {character.zAbilities.map((z, i) => (
            <AbilityBlock key={z.id} label={`Z-Ability ${i + 1}`} ability={z} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
