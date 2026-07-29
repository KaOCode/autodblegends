import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Character, CharacterDb } from "@autodbl/shared";
import { fetchBanners, fetchCharacter, fetchCharacterIndex, fetchEvents, fetchTagMap, sleep } from "./dblegends.js";
import { pushToSupabase } from "./supabase.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../../data");

const CONCURRENCY = 5;
const DELAY_BETWEEN_BATCHES_MS = 300;

// Full DBL roster is 700+ cards. Scraping all of them on every run is slow
// and unnecessarily hammers dblegends.net, so default to a small sample and
// let CI / a scheduled job pass SCRAPE_LIMIT=0 (no limit) for a full sync.
const LIMIT = process.env.SCRAPE_LIMIT ? Number(process.env.SCRAPE_LIMIT) : 40;

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

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  const characters = await scrapeCharacters();
  const characterDb: CharacterDb = { characters, fetchedAt: new Date().toISOString() };
  await writeFile(resolve(DATA_DIR, "characters.json"), JSON.stringify(characterDb, null, 2));
  console.log(`Wrote ${characters.length} characters -> data/characters.json`);

  console.log("Fetching events...");
  const events = await fetchEvents();
  await writeFile(resolve(DATA_DIR, "events.json"), JSON.stringify({ events, fetchedAt: new Date().toISOString() }, null, 2));
  console.log(`Wrote ${events.length} events -> data/events.json`);

  console.log("Fetching banners...");
  const banners = await fetchBanners(characters.map((c) => c.name));
  await writeFile(resolve(DATA_DIR, "banners.json"), JSON.stringify({ banners, fetchedAt: new Date().toISOString() }, null, 2));
  console.log(`Wrote ${banners.length} banners -> data/banners.json`);

  await pushToSupabase({ characters, events, banners });

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
