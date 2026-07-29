/** dblegends.net renders character pages server-side with the raw data
 * embedded as `<script id="..." type="application/json">...</script>`
 * blocks, and a few listing pages assign plain JS globals like
 * `window.EVENTS = [...]`. These helpers pull that JSON back out without
 * needing a full HTML/DOM parser. */

export function extractJsonScript<T>(html: string, scriptId: string): T | null {
  const re = new RegExp(
    `<script id="${scriptId}"\\s*type="application/json">([\\s\\S]*?)<\\/script>`,
  );
  const match = html.match(re);
  if (!match) return null;
  const raw = match[1].trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function extractWindowGlobal<T>(html: string, name: string): T | null {
  const re = new RegExp(`window\\.${name}\\s*=\\s*(\\[[\\s\\S]*?\\]);`);
  const match = html.match(re);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as T;
  } catch {
    return null;
  }
}

/** Extracts `<option value="ID">Name</option>` pairs from a <select>. */
export function extractSelectOptions(html: string): Map<number, string> {
  const map = new Map<number, string>();
  const re = /<option value="(-?\d+)">([^<]*)<\/option>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    map.set(Number(m[1]), decodeHtmlEntities(m[2]));
  }
  return map;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'");
}
