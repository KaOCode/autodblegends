import { copyFile, mkdir, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../../../data");
const DEST = resolve(__dirname, "../public/data");

await mkdir(DEST, { recursive: true });
const files = (await readdir(SRC)).filter((f) => f.endsWith(".json"));
for (const file of files) {
  await copyFile(resolve(SRC, file), resolve(DEST, file));
}
console.log(`Synced ${files.length} data file(s) from data/ -> apps/web/public/data/`);
