import type { Banner, Character, DblEvent } from "./types.js";
import type { OwnedCharacter } from "./optimizer.js";

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

  const hasLegend = featured.some((c) => c.rarity === "LEGEND");
  const hasZenkai = featured.some((c) => c.isZenkai);
  if (hasLegend || hasZenkai) {
    return {
      banner,
      priority: "high",
      reason: `Enthält ${hasLegend ? "LEGEND" : "Zenkai"}-Charakter: ${featured.map((c) => c.name).join(", ")}`,
    };
  }

  return { banner, priority: "medium", reason: `Enthält ${featured.map((c) => c.name).join(", ")}` };
}
