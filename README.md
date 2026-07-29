# AutoDBLegends

Automatischer Team Builder für Dragon Ball Legends. Kein Zwang zur Registrierung –
Inventar & Teams landen standardmäßig lokal im Browser; wer seine Daten
geräteübergreifend behalten möchte, kann sich optional per Magic-Link-E-Mail
anmelden (Supabase).

## Architektur

```
apps/
  scraper/   Node/TS-Scraper gegen dblegends.net (Community-Datenbank)
  web/       React + Vite + TypeScript + Tailwind + HeroUI + eigene Animate-UI-Primitives
packages/
  shared/    Gemeinsame Typen, Team-Optimizer, Event/Banner-Heuristiken
data/        Vom Scraper geschriebene JSON-Snapshots (characters/events/banners)
supabase/    SQL-Schema für optionalen Cloud-Sync
```

Es gibt kein offizielles API von Bandai Namco. `apps/scraper` liest die
Community-Datenbank **dblegends.net**, die Charakterdetails, Events und
Gacha-Banner serverseitig als eingebettete `<script type="application/json">`-
Blöcke ausliefert – kein Headless-Browser nötig, nur `fetch` + Regex-Extraktion
(siehe `apps/scraper/src/htmlJson.ts` und `dblegends.ts`).

### Datenfluss

1. `npm run scrape` (Root) → schreibt `data/characters.json`, `data/events.json`,
   `data/banners.json` und pusht optional zu Supabase (falls `SUPABASE_URL` +
   `SUPABASE_SERVICE_ROLE_KEY` gesetzt sind, siehe `apps/scraper/.env.example`).
2. `apps/web`'s `predev`/`prebuild`-Skript kopiert `data/*.json` nach
   `apps/web/public/data/`, von wo die App sie zur Laufzeit per `fetch` lädt
   (`src/lib/useGameData.ts`). Für "immer top aktuell" den Scraper regelmäßig
   laufen lassen (z.B. Cron/GitHub Action) und/oder auf den Supabase-Cache
   umstellen.

### Team-Optimizer (`packages/shared/src/optimizer.ts`)

Es gibt keine offizielle "Meta-Stärke"-API, daher bewertet der Optimizer
Teams heuristisch aus tatsächlich vorhandenen Daten: Seltenheit, Stats,
gemeinsame Tags/Traits mit dem gewählten Leader (Leader-Skills matchen in DBL
i.d.R. über Tags) und Schlüsselwörter in den Fähigkeitstexten je nach Modus
(PVP/Event/Raid). Die Gewichte in `SCORING_WEIGHTS` sind bewusst einfach
gehalten und sollen bei Bedarf angepasst werden – siehe Kommentar im Code für
die Einschränkungen.

Support-Item-Vorschläge sind bewusst optional/best effort: dblegends.net stellt
keinen generischen Support-Item-Katalog bereit, daher gibt es nur eine kleine
generische Zuordnung nach Modus (siehe `suggestSupportItems`).

### Events & Banner-Prioritäten (`packages/shared/src/eligibility.ts`)

- **Events**: Charaktere aus dem Inventar werden gegen den Event-Namen
  gematcht (Namens-Substring), um zu zeigen, ob du thematisch passende
  Charaktere besitzt.
- **Banner-Priorität**: Banner-Namen enthalten fast immer den Charakternamen
  im Klartext (z.B. "ZENKAI AWAKENING - Goku & Bardock -"). Daraus wird der
  Charakter erkannt und die Priorität aus Seltenheit/Zenkai-Status und
  eigenem Besitzstand abgeleitet.

## Setup

```bash
npm install
npm run scrape          # füllt data/*.json (Standard: 40 Charaktere, SCRAPE_LIMIT=0 für alle ~780)
npm run dev              # startet apps/web (kopiert data/ automatisch nach public/data/)
```

### Optionaler Cloud-Sync (Supabase)

1. Supabase-Projekt anlegen, `supabase/schema.sql` im SQL-Editor ausführen.
2. `apps/web/.env.example` nach `.env` kopieren und `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY` eintragen.
3. Optional: `apps/scraper/.env.example` nach `.env` kopieren und
   `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (Service-Role-Key!) eintragen,
   damit der Scraper den Cache in Supabase aktuell hält.

Ohne diese Variablen läuft die App komplett lokal (localStorage) – das ist
der Standardfall, kein Account nötig.

## UI

React 19 + Tailwind 4 + [HeroUI](https://heroui.com) (React-Aria-basierte
Komponenten wie Button/Card/Chip) als Basis. Für die Animate-UI-Wünsche
(animate-ui.com) wurden schlanke, selbst gebaute Motion-Primitives in
`apps/web/src/components/animate-ui/` ergänzt (`StaggerReveal`,
`SlidingNumber`), da animate-ui.com Komponenten per shadcn-artigem CLI-Copy
statt als npm-Paket vertreibt und dessen Registry aus dieser Umgebung nicht
zuverlässig erreichbar war. Die Komponenten sind API-kompatibel benannt und
können bei Bedarf 1:1 durch echte animate-ui.com-Komponenten ersetzt werden
(`npx shadcn add ...`).

## Bekannte Einschränkungen

- Der Optimizer ist heuristisch, kein echtes Meta-Tier-List-Wissen (siehe oben).
- Banner-Charakter-Erkennung ist Namens-Matching auf Text, kein strukturiertes Feld.
- `isZenkai` wird aus dem Vorhandensein der Zenkai-Sektion auf der Detailseite
  abgeleitet (best effort, siehe `apps/scraper/src/dblegends.ts`).
- Ein voller Scrape aller ~780 Charaktere dauert einige Minuten – für den
  täglichen Gebrauch empfiehlt sich ein geplanter Job statt manuellem Aufruf.
