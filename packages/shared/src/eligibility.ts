import type { Banner, Character, DblEvent } from "./types.js";
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
    (c) => ownedIds.has(c.id) && owned.find((o) => o.character.id === c.id)!.inventory.stars >= 7,
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

  const challengeTexts = (event.difficulties ?? [])
    .flatMap((d) => d.stages)
    .flatMap((s) => s.challenges.map((c) => c.text.toLowerCase()));

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
