import type { Banner, Character, DblEvent, Team } from "./types.js";
import { characterPowerScore, type OwnedCharacter } from "./optimizer.js";

/**
 * Best-effort "can I clear this / is this worth pulling" heuristics.
 * dblegends.net does not expose per-event difficulty or per-banner rates,
 * so this leans on what we can infer: event/banner names often literally
 * contain a character name, and owning strong, on-tag characters is a
 * reasonable proxy for "can probably handle this content".
 */

export function matchEventToOwnedCharacters(
  event: DblEvent,
  owned: OwnedCharacter[],
): OwnedCharacter[] {
  const name = event.name.toLowerCase();
  return owned.filter((o) => name.includes(o.character.name.toLowerCase()));
}

export interface BannerPriority {
  banner: Banner;
  priority: "high" | "medium" | "low";
  reason: string;
}

export function rankBannerPriority(
  banner: Banner,
  characters: Character[],
  owned: OwnedCharacter[],
): BannerPriority {
  const ownedIds = new Set(owned.map((o) => o.character.id));
  const featured = characters.filter((c) =>
    banner.guessedFeaturedCharacterNames.some(
      (n) => n.toLowerCase() === c.name.toLowerCase(),
    ),
  );

  if (featured.length === 0) {
    return { banner, priority: "low", reason: "Kein Charakter im Banner-Namen erkannt" };
  }

  const alreadyOwnedMaxed = featured.every(
    (c) => ownedIds.has(c.id) && owned.find((o) => o.character.id === c.id)!.inventory.stars >= 14,
  );
  if (alreadyOwnedMaxed) {
    return { banner, priority: "low", reason: "Charakter(e) bereits auf max. Sterne" };
  }

  const featuredNames = [...new Set(featured.map((c) => c.name))].join(", ");
  const hasLegend = featured.some((c) => c.rarity === "LEGEND");
  const hasZenkai = featured.some((c) => c.isZenkai);
  if (hasLegend || hasZenkai) {
    return {
      banner,
      priority: "high",
      reason: `Enthält ${hasLegend ? "LEGEND" : "Zenkai"}-Charakter: ${featuredNames}`,
    };
  }

  return { banner, priority: "medium", reason: `Enthält ${featuredNames}` };
}

export interface SuggestedEventCharacter {
  character: OwnedCharacter;
  /** which of the character's own tags/color matched a scraped challenge, e.g. "Battle with Son Family" */
  matchedHints: string[];
}

const SUGGESTION_LIMIT = 7;

function getEventChallengeTexts(event: DblEvent): string[] {
  return (event.difficulties ?? [])
    .flatMap((d) => d.stages)
    .flatMap((s) => s.challenges.map((c) => c.text.toLowerCase()));
}

/**
 * Recommends owned characters for a specific event. Challenge text scraped
 * from the event page (e.g. "Battle with Son Family", "Battle with 2
 * Element: PUR characters or more") tends to literally contain a tag or
 * color name, so matching a character's own tags/color against that text is
 * a cheap, surprisingly reliable signal - no NLP needed. Falls back to
 * plain power ranking when an event has no scraped challenges (or none
 * match), so the section is never empty as long as the user owns anything.
 */
export function suggestCharactersForEvent(
  event: DblEvent,
  owned: OwnedCharacter[],
): SuggestedEventCharacter[] {
  if (owned.length === 0) return [];

  const challengeTexts = getEventChallengeTexts(event);

  const scored = owned.map((entry) => {
    const candidates = [...entry.character.tags, entry.character.color];
    const matchedHints = challengeTexts.length
      ? [...new Set(candidates.filter((tag) => challengeTexts.some((t) => t.includes(tag.toLowerCase()))))]
      : [];
    return { entry, matchedHints, power: characterPowerScore(entry) };
  });

  const withHints = scored.filter((s) => s.matchedHints.length > 0);
  const ranked = (withHints.length > 0 ? withHints : scored).sort((a, b) => {
    if (b.matchedHints.length !== a.matchedHints.length) return b.matchedHints.length - a.matchedHints.length;
    return b.power - a.power;
  });

  return ranked.slice(0, SUGGESTION_LIMIT).map((r) => ({ character: r.entry, matchedHints: r.matchedHints }));
}

/**
 * Turns an event's scraped challenge text into a plain list of tag/color
 * substrings (e.g. ["Son Family", "PUR"]) by checking which tags/colors from
 * the full character roster actually appear in that text. Feed this into
 * `buildOptimalTeam({ eventTagHints })` so the Team Builder can be driven by
 * picking an event from a list instead of typing a tag hint by hand.
 */
export function deriveEventTagHints(event: DblEvent, allCharacters: Character[]): string[] {
  const challengeTexts = getEventChallengeTexts(event);
  if (challengeTexts.length === 0) return [];

  const vocabulary = new Set<string>();
  for (const c of allCharacters) {
    for (const tag of c.tags) vocabulary.add(tag);
    vocabulary.add(c.color);
  }

  return [...vocabulary].filter((tag) => challengeTexts.some((t) => t.includes(tag.toLowerCase())));
}

export interface ZenkaiReadyCharacter {
  character: OwnedCharacter;
  /** the currently live "ZENKAI AWAKENING" banner for this character, if any */
  banner: Banner | null;
  /** relative priority score - higher means "awaken this one first" */
  score: number;
  reasons: string[];
}

const ZENKAI_MIN_STARS = 7;

/**
 * Owned characters that have a Zenkai Awakening available
 * (`character.isZenkai`, derived at scrape time from the card's own Zenkai
 * section), are already rank 7+ (all gold stars - Zenkai Awakening only
 * unlocks once the card is fully ranked up), and that the user hasn't
 * marked as already awakened (`inventory.isZAwakened`).
 *
 * DBL's exchange shop ("Tauschbörse") periodically offers Zenkai Awakening
 * items you spend on whichever eligible owned character you pick - there's
 * no public data source for what's currently in a given player's shop, so
 * instead of guessing shop contents this ranks *which of your own eligible
 * characters is the better pick* whenever one becomes available: stronger
 * cards (rarity/stats), characters with their own leader skill, characters
 * already used in one of your saved teams, and ones with a live Zenkai
 * banner right now (a signal the card is currently "in the spotlight")
 * all push a character higher.
 */
export function findZenkaiReadyCharacters(
  owned: OwnedCharacter[],
  banners: Banner[],
  teams: Team[] = [],
): ZenkaiReadyCharacter[] {
  const now = Date.now();
  const zenkaiBanners = banners.filter((b) => b.type === "Zenkai" && new Date(b.endsAt).getTime() > now);
  const usedInTeamIds = new Set(teams.flatMap((t) => t.slots.map((s) => s.characterId)));

  return owned
    .filter((o) => o.character.isZenkai && !o.inventory.isZAwakened && o.inventory.stars >= ZENKAI_MIN_STARS)
    .map((character) => {
      const banner =
        zenkaiBanners.find((b) =>
          b.guessedFeaturedCharacterNames.some((n) => n.toLowerCase() === character.character.name.toLowerCase()),
        ) ?? null;

      let score = characterPowerScore(character);
      const reasons: string[] = [];

      if (usedInTeamIds.has(character.character.id)) {
        score += 12;
        reasons.push("Wird in einem gespeicherten Team eingesetzt");
      }
      if (character.character.leaderSkill) {
        score += 6;
        reasons.push("Hat eigenen Leader Skill");
      }
      if (banner) {
        score += 8;
        reasons.push("Zenkai-Banner aktuell verfügbar");
      }
      if (character.character.rarity === "LEGEND") {
        reasons.push("LEGEND-Seltenheit");
      }

      return { character, banner, score: Math.round(score * 100) / 100, reasons };
    })
    .sort((a, b) => b.score - a.score);
}
