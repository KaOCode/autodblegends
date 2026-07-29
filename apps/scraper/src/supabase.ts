import type { Banner, Character, DblEvent } from "@autodbl/shared";

/** Optional: if SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set, upsert the
 * freshly scraped data into the public cache tables (see supabase/schema.sql)
 * via PostgREST, so the web app can read live data instead of the bundled
 * data/*.json snapshot. Silently skipped when not configured (e.g. local
 * dev without a Supabase project yet). */
export async function pushToSupabase(payload: {
  characters: Character[];
  events: DblEvent[];
  banners: Banner[];
}): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set, skipping cloud sync.");
    return;
  }

  await upsert(url, key, "characters", payload.characters.map(toCharacterRow));
  await upsert(url, key, "events", payload.events.map(toEventRow));
  await upsert(url, key, "banners", payload.banners.map(toBannerRow));
  console.log("Pushed scraped data to Supabase.");
}

async function upsert(url: string, key: string, table: string, rows: unknown[]): Promise<void> {
  if (rows.length === 0) return;
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    throw new Error(`Supabase upsert into ${table} failed: ${res.status} ${await res.text()}`);
  }
}

function toCharacterRow(c: Character) {
  return {
    id: c.id,
    name: c.name,
    card: c.card,
    rarity: c.rarity,
    element: c.element,
    color: c.color,
    img: c.img,
    is_zenkai: c.isZenkai,
    is_legends_limited: c.isLegendsLimited,
    stats_max: c.statsMax,
    stats_min: c.statsMin,
    tags: c.tags,
    traits: c.traits,
    leader_skill: c.leaderSkill ?? null,
    main_ability: c.mainAbility ?? null,
    z_abilities: c.zAbilities,
    release_order: c.releaseOrder,
  };
}

function toEventRow(e: DblEvent) {
  return {
    id: e.id,
    name: e.name,
    img: e.img,
    begins_at: e.beginsAt,
    ends_at: e.endsAt,
    is_permanent: e.isPermanent,
    status: e.status,
  };
}

function toBannerRow(b: Banner) {
  return {
    id: b.id,
    name: b.name,
    img: b.img,
    type: b.type,
    begins_at: b.beginsAt,
    ends_at: b.endsAt,
    is_permanent: b.isPermanent,
    is_step_up: b.isStepUp,
    guessed_featured_character_names: b.guessedFeaturedCharacterNames,
  };
}
