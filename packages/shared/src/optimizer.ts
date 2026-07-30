import type {
  BuiltTeam,
  Character,
  InventoryEntry,
  SupportItem,
  TeamMode,
} from "./types.js";

/**
 * Heuristic team optimizer.
 *
 * There is no official DBL API exposing "meta strength" or exact leader-skill
 * targeting rules, so this scores teams from data we actually have (rarity,
 * stats, shared tags/traits, ability text keywords) instead of a hardcoded
 * tier list. Treat the score as a relative ranking aid, not ground truth -
 * the weights in SCORING_WEIGHTS are tuned by feel and meant to be adjusted.
 */

const TEAM_SIZE = 7;
const LEADER_CANDIDATE_POOL = 15;

const RARITY_WEIGHT: Record<string, number> = {
  LEGEND: 5,
  ULTRA: 4,
  SPARKING: 3,
  EXTREME: 2,
  HERO: 1,
};

const SCORING_WEIGHTS = {
  statBase: 1 / 20000, // normalizes raw stat sums into a small number
  rarity: 8,
  zenkai: 6,
  legendsLimited: 4,
  starLevel: 1.5, // per star, 0-14 (7 gold + 7 red)
  sharedTagWithLeader: 10,
  sharedTraitWithLeader: 4,
  colorDiversityBonus: 3,
  modeKeywordMatch: 6,
  eventTagMatch: 20,
};

const MODE_KEYWORDS: Record<TeamMode, string[]> = {
  pvp: ["damage guard", "nullify", "endurance", "switch gauge", "ki recovery"],
  raid: ["damage +", "critical", "arts damage", "blast atk", "strike atk"],
  event: ["health restoration", "damage +", "ki +"],
};

export interface OwnedCharacter {
  character: Character;
  inventory: InventoryEntry;
}

export interface BuildTeamOptions {
  mode: TeamMode;
  owned: OwnedCharacter[];
  /** tag/color substrings relevant to a specific event (see deriveEventTagHints
   * in eligibility.ts), matched loosely against each candidate's own tags */
  eventTagHints?: string[];
  /** build the team around this specific owned character instead of letting
   * the optimizer pick the leader */
  fixedLeaderId?: number;
}

/** Rarity/stats/stars power estimate for one owned card, independent of any
 * team/leader context. Exported so other heuristics (e.g. event character
 * suggestions in eligibility.ts) can rank owned characters consistently
 * without duplicating the formula. */
export function characterPowerScore(entry: OwnedCharacter): number {
  return baseScore(entry);
}

function baseScore(entry: OwnedCharacter): number {
  const { character: c, inventory: inv } = entry;
  const statSum =
    c.statsMax.hp * 0.4 +
    c.statsMax.strikeAtk +
    c.statsMax.blastAtk +
    c.statsMax.strikeDef * 0.5 +
    c.statsMax.blastDef * 0.5;

  let score = statSum * SCORING_WEIGHTS.statBase;
  score += (RARITY_WEIGHT[c.rarity] ?? 1) * SCORING_WEIGHTS.rarity;
  if (c.isZenkai) score += SCORING_WEIGHTS.zenkai;
  if (c.isLegendsLimited) score += SCORING_WEIGHTS.legendsLimited;
  score += Math.min(inv.stars, 14) * SCORING_WEIGHTS.starLevel;
  return score;
}

function sharedCount(a: string[], b: string[]): number {
  const setB = new Set(b.map((s) => s.toLowerCase()));
  return a.reduce((n, tag) => n + (setB.has(tag.toLowerCase()) ? 1 : 0), 0);
}

function abilityKeywordScore(c: Character, keywords: string[]): number {
  const haystack = [
    c.mainAbility?.body ?? "",
    ...c.zAbilities.map((z) => z.body),
  ]
    .join(" ")
    .toLowerCase();
  return keywords.reduce((n, kw) => n + (haystack.includes(kw) ? 1 : 0), 0);
}

function synergyScore(
  candidate: OwnedCharacter,
  leader: OwnedCharacter,
  mode: TeamMode,
  eventTagHints?: string[],
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const sharedTags = sharedCount(candidate.character.tags, leader.character.tags);
  if (sharedTags > 0) {
    score += sharedTags * SCORING_WEIGHTS.sharedTagWithLeader;
    reasons.push(`teilt ${sharedTags} Tag(s) mit Leader ${leader.character.name}`);
  }

  const sharedTraits = sharedCount(candidate.character.traits, leader.character.traits);
  if (sharedTraits > 0) {
    score += sharedTraits * SCORING_WEIGHTS.sharedTraitWithLeader;
  }

  const keywordHits = abilityKeywordScore(candidate.character, MODE_KEYWORDS[mode]);
  if (keywordHits > 0) {
    score += keywordHits * SCORING_WEIGHTS.modeKeywordMatch;
    reasons.push(`${keywordHits} passende Fähigkeit(en) für Modus "${mode}"`);
  }

  if (eventTagHints && eventTagHints.length > 0) {
    const candidateTags = [...candidate.character.tags, candidate.character.color].map((t) => t.toLowerCase());
    const matched = eventTagHints.filter((hint) => {
      const h = hint.toLowerCase();
      return candidateTags.some((t) => t === h || t.includes(h) || h.includes(t));
    });
    if (matched.length > 0) {
      score += matched.length * SCORING_WEIGHTS.eventTagMatch;
      reasons.push(`Passt zu Event-Anforderung(en): ${matched.join(", ")}`);
    }
  }

  return { score, reasons };
}

function colorDiversity(team: OwnedCharacter[]): number {
  const colors = new Set(team.map((t) => t.character.color));
  return colors.size * SCORING_WEIGHTS.colorDiversityBonus;
}

const SUPPORT_ITEM_CATALOG: SupportItem[] = [
  { id: "ki-recovery", name: "Ki Recovery Support", effectSummary: "Erhöht Ki-Regeneration zu Rundenbeginn" },
  { id: "damage-guard", name: "Damage Guard Support", effectSummary: "Reduziert erhaltenen Schaden für die ersten Runden" },
  { id: "strike-boost", name: "Strike ATK Support", effectSummary: "Erhöht Strike-Schaden des Teams" },
  { id: "blast-boost", name: "Blast ATK Support", effectSummary: "Erhöht Blast-Schaden des Teams" },
  { id: "health-recovery", name: "Health Recovery Support", effectSummary: "Heilt bei Kartenwechsel" },
];

function suggestSupportItems(mode: TeamMode, team: OwnedCharacter[]): SupportItem[] {
  // Best-effort only: dblegends.net does not expose a scrapable generic
  // support-item catalog, so this maps mode -> plausible generic picks
  // rather than reading the user's actual unlocked support items.
  if (mode === "pvp") return [SUPPORT_ITEM_CATALOG[1], SUPPORT_ITEM_CATALOG[0]];
  if (mode === "raid") {
    const strikeHeavy =
      team.reduce((n, t) => n + t.character.statsMax.strikeAtk, 0) >=
      team.reduce((n, t) => n + t.character.statsMax.blastAtk, 0);
    return [strikeHeavy ? SUPPORT_ITEM_CATALOG[2] : SUPPORT_ITEM_CATALOG[3], SUPPORT_ITEM_CATALOG[0]];
  }
  return [SUPPORT_ITEM_CATALOG[4], SUPPORT_ITEM_CATALOG[0]];
}

interface CandidateTeam {
  team: OwnedCharacter[];
  leader: OwnedCharacter;
  score: number;
  reasoning: string[];
}

function buildTeamAroundLeader(
  leader: OwnedCharacter,
  owned: OwnedCharacter[],
  mode: TeamMode,
  eventTagHints: string[] | undefined,
  leaderReason: string,
): CandidateTeam {
  const rest = owned.filter((o) => o.character.id !== leader.character.id);
  const scored = rest.map((candidate) => {
    const { score: synergy, reasons } = synergyScore(candidate, leader, mode, eventTagHints);
    const total = baseScore(candidate) + synergy;
    return { candidate, total, reasons };
  });
  scored.sort((a, b) => b.total - a.total);

  const members = scored.slice(0, TEAM_SIZE - 1);
  const team = [leader, ...members.map((m) => m.candidate)];
  const memberReasons = members.flatMap((m) => m.reasons);

  const score =
    baseScore(leader) * 1.5 + // leader counts extra since their leader skill affects the whole team
    members.reduce((n, m) => n + m.total, 0) +
    colorDiversity(team);

  return { team, leader, score, reasoning: [leaderReason, ...memberReasons] };
}

function toBuiltTeam(candidate: CandidateTeam, mode: TeamMode): BuiltTeam {
  return {
    mode,
    slots: candidate.team.map((t) => ({
      characterId: t.character.id,
      isLeader: t.character.id === candidate.leader.character.id,
    })),
    suggestedSupportItems: suggestSupportItems(mode, candidate.team),
    score: Math.round(candidate.score * 100) / 100,
    reasoning: candidate.reasoning,
  };
}

export function buildOptimalTeam(options: BuildTeamOptions): BuiltTeam | null {
  const { mode, owned, eventTagHints, fixedLeaderId } = options;
  if (owned.length === 0) return null;

  if (fixedLeaderId != null) {
    const leader = owned.find((o) => o.character.id === fixedLeaderId);
    if (!leader) return null;
    const candidate = buildTeamAroundLeader(
      leader,
      owned,
      mode,
      eventTagHints,
      `${leader.character.name} als Leader gewählt (manuell)`,
    );
    return toBuiltTeam(candidate, mode);
  }

  const withLeaderSkill = owned.filter((o) => o.character.leaderSkill);
  const leaderPool = (withLeaderSkill.length > 0 ? withLeaderSkill : owned)
    .map((o) => ({ o, base: baseScore(o) }))
    .sort((a, b) => b.base - a.base)
    .slice(0, LEADER_CANDIDATE_POOL)
    .map((x) => x.o);

  let best: CandidateTeam | null = null;
  for (const leader of leaderPool) {
    const candidate = buildTeamAroundLeader(
      leader,
      owned,
      mode,
      eventTagHints,
      `${leader.character.name} als Leader gewählt (bester Basis-/Synergie-Score)`,
    );
    if (!best || candidate.score > best.score) best = candidate;
  }

  if (!best) return null;
  return toBuiltTeam(best, mode);
}

export interface LeaderCandidate {
  character: OwnedCharacter;
  score: number;
  hasLeaderSkill: boolean;
}

/** Ranks the owned roster by how well-suited each card is to be a leader:
 * characters with their own Leader Skill ability come first (that's the
 * whole point of picking a leader deliberately), sorted by power score
 * within each group. Used to populate a "choose your leader" picker instead
 * of leaving leader selection fully automatic. */
export function rankLeaderCandidates(owned: OwnedCharacter[], limit = 20): LeaderCandidate[] {
  return owned
    .map((o) => ({ character: o, score: baseScore(o), hasLeaderSkill: Boolean(o.character.leaderSkill) }))
    .sort((a, b) => {
      if (a.hasLeaderSkill !== b.hasLeaderSkill) return a.hasLeaderSkill ? -1 : 1;
      return b.score - a.score;
    })
    .slice(0, limit);
}
