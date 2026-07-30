export type Rarity = "LEGEND" | "ULTRA" | "SPARKING" | "EXTREME" | "HERO" | string;

export interface CharacterStats {
  hp: number;
  strikeAtk: number;
  blastAtk: number;
  strikeDef: number;
  blastDef: number;
}

export interface AbilityText {
  id: number;
  title: string;
  body: string;
}

/** One character card as scraped from dblegends.net, normalized for the app. */
export interface Character {
  id: number;
  name: string;
  card: string;
  rarity: Rarity;
  /** e.g. "Blue+", "Yellow" */
  element: string;
  /** short color code parsed from element, e.g. "BLU" */
  color: string;
  img: string;
  isZenkai: boolean;
  isLegendsLimited: boolean;
  statsMax: CharacterStats;
  statsMin: CharacterStats;
  /** tag names (categories such as "Son Family", "Fusion", "Universe Rep") */
  tags: string[];
  /** trait names */
  traits: string[];
  leaderSkill?: AbilityText;
  mainAbility?: AbilityText;
  zAbilities: AbilityText[];
  releaseOrder: number;
}

export interface CharacterDb {
  characters: Character[];
  fetchedAt: string;
}

export interface EventEnemy {
  characterId: number | null;
  name: string;
  level: number | null;
}

export interface EventDrop {
  name: string;
  qty: string;
}

export interface EventChallenge {
  text: string;
  reward: EventDrop | null;
}

export interface EventStage {
  name: string;
  stamina: number | null;
  enemies: EventEnemy[];
  exp: string | null;
  zeni: string | null;
  firstClearDrops: EventDrop[];
  challenges: EventChallenge[];
}

export interface EventDifficulty {
  index: number;
  stages: EventStage[];
}

export interface DblEvent {
  id: number;
  name: string;
  img: string;
  beginsAt: string;
  endsAt: string;
  isPermanent: boolean;
  status: "active" | "upcoming" | "expired";
  /** Only populated for active/upcoming events (see apps/scraper) - fetching
   * stage detail for all ~1000+ historical events would be wasteful. */
  difficulties?: EventDifficulty[];
}

export interface Banner {
  id: number;
  name: string;
  img: string;
  type: "Crystal" | "Ticket" | "Zenkai" | string;
  beginsAt: string;
  endsAt: string;
  isPermanent: boolean;
  isStepUp: boolean;
  /** character names we could fuzzy-match out of the banner name, best effort */
  guessedFeaturedCharacterNames: string[];
}

/** One card the user owns, with their progression on it. */
export interface InventoryEntry {
  characterId: number;
  /** 1-7 zeni/rank stars as shown in-game */
  stars: number;
  level: number;
  isZAwakened: boolean;
  copies: number;
  updatedAt: string;
}

export type TeamMode = "pvp" | "event" | "raid";

export interface SupportItem {
  id: string;
  name: string;
  effectSummary: string;
}

export interface TeamSlot {
  characterId: number;
  isLeader: boolean;
}

export interface BuiltTeam {
  mode: TeamMode;
  slots: TeamSlot[];
  suggestedSupportItems: SupportItem[];
  score: number;
  reasoning: string[];
}

export interface Team {
  id: string;
  name: string;
  mode: TeamMode;
  slots: TeamSlot[];
  supportItemIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  inventory: InventoryEntry[];
  teams: Team[];
}
