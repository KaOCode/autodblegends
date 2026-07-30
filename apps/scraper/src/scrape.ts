import "dotenv/config";
import { setDefaultResultOrder } from "node:dns";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Character, CharacterDb, DblEvent } from "@autodbl/shared";
import {
  fetchBanners,
  fetchCharacter,
  fetchCharacterIndex,
  fetchEventDetail,
  fetchEvents,
  fetchTagMap,
  sleep,
} from "./dblegends.js";
import { pushToSupabase } from "./supabase.js";

// Node's fetch (undici) resolves DNS itself and, on some Windows/ISP setups,
// picks a AAAA (IPv6) record that then hangs/times out even though IPv4
// works fine (same symptom as a browser working but `npm run scrape`
// throwing UND_ERR_CONNECT_TIMEOUT). Preferring IPv4 first avoids that.
setDefaultResultOrder("ipv4first");

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../../data");

const CONCURRENCY = 5;
const DELAY_BETWEEN_BATCHES_MS = 300;

// Full DBL roster is 780+ cards; a full run takes ~2-3 min at this
// concurrency/delay, which is fine as the default so `npm run scrape` "just
// works" without silently truncating the roster. Pass SCRAPE_LIMIT=<n> for
// a quick partial run while iterating on the scraper itself.
const LIMIT = process.env.SCRAPE_LIMIT ? Number(process.env.SCRAPE_LIMIT) : 0;

async function scrapeCharacters(): Promise<Character[]> {
  console.log("Fetching character index + tag map...");
  const [index, tagMap] = await Promise.all([fetchCharacterIndex(), fetchTagMap()]);
  console.log(`Index has ${index.length} entries, ${tagMap.size} known tags.`);

  const targets = LIMIT > 0 ? index.slice(0, LIMIT) : index;
  const results: Character[] = [];

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const fetched = await Promise.all(
      batch.map(async (entry) => {
        try {
          return await fetchCharacter(entry.id, tagMap);
        } catch (err) {
          console.warn(`  skip #${entry.id} (${entry.name}): ${(err as Error).message}`);
          return null;
        }
      }),
    );
    for (const c of fetched) if (c) results.push(c);
    console.log(`  ${Math.min(i + CONCURRENCY, targets.length)}/${targets.length} characters fetched`);
    if (i + CONCURRENCY < targets.length) await sleep(DELAY_BETWEEN_BATCHES_MS);
  }

  return results;
}

/** Stage/reward detail lives on separate /event/{id} pages. Fetching all
 * ~1200+ historical events on every run would be wasteful and slow, so only
 * active/upcoming events (the ones actually relevant to "what can I clear
 * right now") get enriched. */
async function enrichEventDetails(events: DblEvent[]): Promise<DblEvent[]> {
  const relevant = events.filter((e) => e.status !== "expired");
  console.log(`Fetching stage details for ${relevant.length} active/upcoming events...`);
  const detailById = new Map<number, DblEvent["difficulties"]>();

  for (let i = 0; i < relevant.length; i += CONCURRENCY) {
    const batch = relevant.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (event) => {
        try {
          detailById.set(event.id, await fetchEventDetail(event.id));
        } catch (err) {
          console.warn(`  skip event detail #${event.id} (${event.name}): ${(err as Error).message}`);
        }
      }),
    );
    if (i + CONCURRENCY < relevant.length) await sleep(DELAY_BETWEEN_BATCHES_MS);
  }

  return events.map((e) => (detailById.has(e.id) ? { ...e, difficulties: detailById.get(e.id) } : e));
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  const characters = await scrapeCharacters();
  const characterDb: CharacterDb = { characters, fetchedAt: new Date().toISOString() };
  await writeFile(resolve(DATA_DIR, "characters.json"), JSON.stringify(characterDb, null, 2));
  console.log(`Wrote ${characters.length} characters -> data/characters.json`);

  console.log("Fetching events...");
  const eventsRaw = await fetchEvents();
  const events = await enrichEventDetails(eventsRaw);
  await writeFile(resolve(DATA_DIR, "events.json"), JSON.stringify({ events, fetchedAt: new Date().toISOString() }, null, 2));
  console.log(`Wrote ${events.length} events -> data/events.json`);

  console.log("Fetching banners...");
  const banners = await fetchBanners(characters.map((c) => c.name));
  await writeFile(resolve(DATA_DIR, "banners.json"), JSON.stringify({ banners, fetchedAt: new Date().toISOString() }, null, 2));
  console.log(`Wrote ${banners.length} banners -> data/banners.json`);

  try {
    await pushToSupabase({ characters, events, banners });
  } catch (err) {
    // Local data/*.json already written successfully above; Supabase sync
    // is optional/best-effort, so don't fail the whole run over it (e.g.
    // schema.sql not applied yet).
    console.warn(`Supabase sync failed, local data/*.json is still up to date: ${(err as Error).message}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
