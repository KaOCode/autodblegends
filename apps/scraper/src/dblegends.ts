import type { AbilityText, Banner, Character, DblEvent } from "@autodbl/shared";
import { extractJsonScript, extractSelectOptions, extractWindowGlobal } from "./htmlJson.js";

const BASE = "https://dblegends.net";
const USER_AGENT =
  "Mozilla/5.0 (compatible; AutoDBLegendsBot/0.1; +https://github.com/kaocode/autodblegends) team-builder data sync";

async function fetchHtml(path: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
  });
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

export interface IndexEntry {
  id: number;
  name: string;
  card: string;
}

/** One request gets the full character roster (id/name/card) via the
 * <script id="index"> block embedded on every character detail page. */
export async function fetchCharacterIndex(): Promise<IndexEntry[]> {
  const html = await fetchHtml("/character/1");
  const index = extractJsonScript<IndexEntry[]>(html, "index");
  if (!index) throw new Error("Could not find character index on /character/1");
  return index;
}

/** Global tag/category id -> name map, scraped from the filter <select> on
 * the character list page (e.g. 1 -> "Son Family", 15000 -> "RED"). */
export async function fetchTagMap(): Promise<Map<number, string>> {
  const html = await fetchHtml("/characters");
  return extractSelectOptions(html);
}

interface RawCharacterData {
  id: number;
  name: string;
  card: string;
  rarity: string;
  ll: number;
  img: string;
  el: string;
  ic: string;
  ar: Record<string, number>;
  min: Record<string, number>;
  max: Record<string, number>;
  ab: {
    m: number;
    z: number[];
    legend: number;
  };
  tg: [number, number, number][];
}

type AbilityLookup = Record<string, [string, string]>;
type TraitLookup = Record<string, [string, string]>;

function toAbilityText(id: number, lookup: AbilityLookup | null): AbilityText | undefined {
  if (id === undefined || id === null || id < 0 || !lookup) return undefined;
  const entry = lookup[String(id)];
  if (!entry) return undefined;
  return { id, title: entry[0] ?? "", body: entry[1] ?? "" };
}

export async function fetchCharacter(
  id: number,
  tagMap: Map<number, string>,
): Promise<Character | null> {
  const html = await fetchHtml(`/character/${id}`);
  const dataById = extractJsonScript<Record<string, RawCharacterData>>(html, "data");
  const raw = dataById?.[String(id)];
  if (!raw) return null;

  const ab = extractJsonScript<AbilityLookup>(html, "ab");
  const traitLookup = extractJsonScript<TraitLookup>(html, "tr");
  const zkHtml = extractJsonScript<string>(html, "zkhtml") ?? "";

  const tagIds = new Set<number>((raw.tg ?? []).map(([, , tagId]) => tagId));
  const tags = [...tagIds]
    .map((tagId) => tagMap.get(tagId))
    .filter((v): v is string => Boolean(v));

  // trait ids referenced live inside the same "data" blob under `tr`,
  // named via the per-character `tr` script block.
  const rawWithTraits = raw as unknown as { tr?: [number, number, number][] };
  const traitIds = new Set<number>((rawWithTraits.tr ?? []).map(([, , traitId]) => traitId));
  const traits = [...traitIds]
    .map((traitId) => traitLookup?.[String(traitId)]?.[0])
    .filter((v): v is string => Boolean(v));

  const color = raw.ic ? raw.ic.replace(/\d+$/, "") : raw.el.replace(/[^A-Za-z]/g, "").toUpperCase();

  return {
    id: raw.id,
    name: raw.name,
    card: raw.card,
    rarity: raw.rarity,
    element: raw.el,
    color,
    img: raw.img,
    isZenkai: zkHtml.trim().length > 2,
    isLegendsLimited: Boolean(raw.ll),
    statsMax: {
      hp: raw.max?.hp ?? 0,
      strikeAtk: raw.max?.sa ?? 0,
      blastAtk: raw.max?.ba ?? 0,
      strikeDef: raw.max?.sd ?? 0,
      blastDef: raw.max?.bd ?? 0,
    },
    statsMin: {
      hp: raw.min?.hp ?? 0,
      strikeAtk: raw.min?.sa ?? 0,
      blastAtk: raw.min?.ba ?? 0,
      strikeDef: raw.min?.sd ?? 0,
      blastDef: raw.min?.bd ?? 0,
    },
    tags,
    traits,
    leaderSkill: toAbilityText(raw.ab?.legend, ab ?? null),
    mainAbility: toAbilityText(raw.ab?.m, ab ?? null),
    zAbilities: (raw.ab?.z ?? [])
      .map((zid) => toAbilityText(zid, ab ?? null))
      .filter((v): v is AbilityText => Boolean(v)),
    releaseOrder: raw.id,
  };
}

interface RawEvent {
  id: number;
  name: string;
  img: string;
  begin: number;
  end: number;
  perm: number;
}

export async function fetchEvents(): Promise<DblEvent[]> {
  const html = await fetchHtml("/events");
  const raw = extractWindowGlobal<RawEvent[]>(html, "EVENTS") ?? [];
  const now = Date.now() / 1000;
  return raw.map((e) => ({
    id: e.id,
    name: e.name,
    img: e.img,
    beginsAt: new Date(e.begin * 1000).toISOString(),
    endsAt: new Date(e.end * 1000).toISOString(),
    isPermanent: Boolean(e.perm),
    status: e.perm || (e.begin <= now && e.end >= now) ? "active" : e.begin > now ? "upcoming" : "expired",
  }));
}

interface RawGacha {
  id: number;
  type: number;
  type_label: string;
  name: string;
  img: string;
  begin: number;
  end: number;
  perm: number;
  stepup: number;
}

const KNOWN_CHARACTER_NAME_STOPWORDS = new Set([
  "the",
  "of",
  "and",
  "a",
  "to",
]);

function guessFeaturedNames(bannerName: string, allNames: string[]): string[] {
  const lowerBanner = bannerName.toLowerCase();
  const uniqueNames = [...new Set(allNames)];
  return uniqueNames.filter((name) => {
    if (name.length < 3) return false;
    if (KNOWN_CHARACTER_NAME_STOPWORDS.has(name.toLowerCase())) return false;
    return lowerBanner.includes(name.toLowerCase());
  });
}

export async function fetchBanners(characterNames: string[]): Promise<Banner[]> {
  const html = await fetchHtml("/summons");
  const raw = extractWindowGlobal<RawGacha[]>(html, "GACHA") ?? [];
  return raw.map((g) => ({
    id: g.id,
    name: g.name,
    img: g.img,
    type: g.type_label,
    beginsAt: new Date(g.begin * 1000).toISOString(),
    endsAt: new Date(g.end * 1000).toISOString(),
    isPermanent: Boolean(g.perm),
    isStepUp: Boolean(g.stepup),
    guessedFeaturedCharacterNames: guessFeaturedNames(g.name, characterNames),
  }));
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
