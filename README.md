# AutoDBLegends

Automatischer Team Builder für Dragon Ball Legends. Kein Zwang zur Registrierung –
Inventar & Teams landen standardmäßig lokal im Browser; wer seine Daten
geräteübergreifend behalten möchte, kann sich optional per Magic-Link-E-Mail
anmelden (Supabase).

## Architektur

```
apps/
  scraper/   Node/TS-Scraper gegen dblegends.net (Community-Datenbank)
  web/       React + Vite + TypeScript + Tailwind + HeroUI + Redux Toolkit + PWA
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

1. `npm run scrape` (Root) → schreibt `data/characters.json` (voller Roster,
   ~780 Charaktere bei `SCRAPE_LIMIT=0`), `data/events.json` (inkl.
   Stage-Details für aktive/anstehende Events, siehe unten) und
   `data/banners.json`; pusht optional zu Supabase (falls `SUPABASE_URL` +
   `SUPABASE_SECRET_KEY` gesetzt sind, siehe `apps/scraper/.env.example`).
2. `apps/web`'s `predev`/`prebuild`-Skript kopiert `data/*.json` nach
   `apps/web/public/data/`, von wo die App sie zur Laufzeit per `fetch` lädt
   (`store/gameDataSlice.ts`). Für "immer top aktuell" den Scraper regelmäßig
   laufen lassen (z.B. Cron/GitHub Action) und/oder auf den Supabase-Cache
   umstellen.
3. Event-Stage-Details (`fetchEventDetail` in `apps/scraper/src/dblegends.ts`,
   Parsing mit `cheerio`) werden nur für Events geholt, die nicht `expired`
   sind – ein voller Scrape aller ~1200 historischen Events wäre unnötig
   teuer. Angezeigt werden sie im `EventModal` beim Klick auf ein Event.

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
  Charaktere besitzt. Zusätzlich schlägt `suggestCharactersForEvent` im
  `EventModal` konkrete Charaktere aus deinem Inventar vor: die von
  dblegends.net gescrapten Challenge-Texte einer Stage (z.B. "Battle with
  Son Family", "Battle with 2 Element: PUR characters or more") enthalten
  fast immer wörtlich einen Tag- oder Farbnamen, der direkt gegen die Tags
  des Charakters gematcht wird – kein Kartenwissen nötig, nur Textabgleich.
  Ohne Treffer fällt es auf eine reine Stärke-Rangliste zurück
  (`characterPowerScore`), damit der Abschnitt nie leer ist.
- **Banner-Priorität**: Banner-Namen enthalten fast immer den Charakternamen
  im Klartext (z.B. "ZENKAI AWAKENING - Goku & Bardock -"). Daraus wird der
  Charakter erkannt und die Priorität aus Seltenheit/Zenkai-Status und
  eigenem Besitzstand abgeleitet. Klick auf einen Banner öffnet ein
  `BannerModal` mit allen erkannten Charakter-Karten (klickbar zum
  `CharacterModal`).

## Setup

```bash
npm install
npm run scrape          # füllt data/*.json mit dem vollen Roster (~780 Charaktere, dauert ~2-3 Min.)
                         # für einen schnellen Testlauf: SCRAPE_LIMIT=25 npm run scrape
npm run dev              # startet apps/web (kopiert data/ automatisch nach public/data/)
```

**`npm run scrape` bricht mit `UND_ERR_CONNECT_TIMEOUT` / `fetch failed` ab?**
Das ist ein lokales Netzwerkproblem, kein Bug im Scraper – Node erreicht
`dblegends.net` nicht. Häufigste Ursachen (v.a. unter Windows):

1. Firewall/Antivirus/VPN blockiert ausgehende Verbindungen von `node.exe`.
2. Kaputtes/langsames IPv6 beim Provider – Node bevorzugt dann eine
   IPv6-Adresse, die nicht antwortet, obwohl IPv4 funktioniert (der Scraper
   erzwingt bereits `dns.setDefaultResultOrder("ipv4first")`, sollte also die
   meisten Fälle abdecken).
3. Kein Internetzugang / DNS-Problem im aktuellen Netzwerk.

Zum Eingrenzen: `curl https://dblegends.net` bzw. `ping dblegends.net` in
derselben Konsole ausprobieren. Klappt das auch nicht, liegt es am Netzwerk
(Firewall/VPN/DNS), nicht am Projekt.

### Optionaler Cloud-Sync (Supabase)

Supabase nutzt seit 2025 ein neues API-Key-Format: **publishable** (client-
safe, ersetzt den alten JWT-Anon-Key) und **secret** (server-only, ersetzt
den alten Service-Role-Key). Beide findest du in Project Settings → API Keys.

1. Supabase-Projekt anlegen.
2. **`supabase/schema.sql` im SQL-Editor des Projekts ausführen** (Dashboard
   → SQL Editor → Datei-Inhalt einfügen → Run). Das muss manuell passieren:
   der Secret Key erlaubt zwar Lese-/Schreibzugriff auf bestehende Tabellen
   (PostgREST), aber kein `CREATE TABLE` (DDL) aus der Ferne.
3. `apps/web/.env.example` nach `apps/web/.env` kopieren und
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (den
   `sb_publishable_...`-Key) eintragen.
4. Optional: `apps/scraper/.env.example` nach `apps/scraper/.env` kopieren
   und `SUPABASE_URL` / `SUPABASE_SECRET_KEY` (den `sb_secret_...`-Key)
   eintragen, damit `npm run scrape` den Cache in Supabase aktuell hält.

Ohne diese Variablen läuft die App komplett lokal (localStorage) – das ist
der Standardfall, kein Account nötig. `.env`-Dateien sind gitignored und
werden nie committed.

⚠️ Der Secret Key (`sb_secret_...`) umgeht Row Level Security und gehört
ausschließlich in `apps/scraper/.env` (Server-seitig) – niemals in
`apps/web`, niemals ins Git-Repo, niemals in Chat-Nachrichten teilen. Falls
ein Secret Key doch mal irgendwo geteilt wurde: in den Supabase-Dashboard-
Einstellungen rotieren.

**Migration (nur falls `schema.sql` schon vor dem 14-Sterne-Support
ausgeführt wurde):** Die `stars`-Spalte hatte ursprünglich
`check (stars between 0 and 7)`. DBL rankt Charaktere aber über 7 goldene
*und* 7 weitere rote Sterne (0-14 gesamt). Bestehende Installationen müssen
den Constraint einmalig im SQL-Editor nachziehen:

```sql
alter table public.user_inventory drop constraint user_inventory_stars_check;
alter table public.user_inventory add check (stars between 0 and 14);
```

## State Management

[Redux Toolkit](https://redux-toolkit.js.org/) (`apps/web/src/store/`):

- `authSlice` – Supabase-Session (Magic-Link-Login/Logout als Thunks)
- `profileSlice` – Inventar & Teams; jede Mutation schreibt sofort lokal
  (via `store.subscribe` → localStorage) und, falls eingeloggt, zusätzlich
  nach Supabase. `syncWithCloud` merged beim Login lokale und Cloud-Daten
  (neuester `updatedAt` gewinnt).
- `gameDataSlice` – Charaktere/Events/Banner aus `public/data/*.json`.

`AppBootstrap.tsx` verkabelt den Supabase-Auth-Listener und den initialen
Datenabruf beim App-Start.

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

### Sorare-artige Detailkarte (4s Hover) & Klick-Modals

`useLongHover` (`src/lib/useLongHover.ts`) feuert erst nach 4 Sekunden
Hover/Tap-and-Hold und zeigt per Portal eine schnelle, read-only
`CharacterDetailCard`-Vorschau neben der Karte: großes Artwork, farbiger
Foil-Rand je nach Element, Zugehörigkeit (Tags) sowie Leader-Skill/Main-
Ability/Z-Abilities im Volltext – angelehnt an das Kartenlayout von
Sorare.com, mit animiertem Hologramm-Glanz beim Erscheinen.

**Klick** auf eine Charakter-Karte (Inventar & Team Builder) öffnet
zusätzlich `CharacterModal.tsx` – die volle Detailkarte plus einen klaren
Inventar-Editor (Sterne, Level, Kopien, Z-Awakened, Hinzufügen/Entfernen).
Das ersetzt das alte Inline-Stern-Klicken direkt in der Kartenübersicht, was
in der dichten Liste schnell unpräzise/fummelig wurde.

**Klick** auf ein Event (Events & Banner) öffnet `EventModal.tsx` mit
Stage-für-Stage-Details: Gegner, Level, EXP/Zeni, Erstclear-Drops und
Challenges (aus den neu gescrapten `/event/{id}`-Seiten, siehe unten).

### PWA

`vite-plugin-pwa` ist eingerichtet (Manifest, Icons, Service Worker mit
`autoUpdate`, Offline-Caching für `/data/*.json`). Für einen lokalen PWA-Test:

```bash
npm run build -w apps/web && npm run preview -w apps/web
```

(Im Dev-Server ist der Service Worker bewusst deaktiviert, damit er sich
nicht mit Vites HMR beißt – siehe `devOptions.enabled` in `vite.config.ts`.)

## Bekannte Einschränkungen

- Der Optimizer ist heuristisch, kein echtes Meta-Tier-List-Wissen (siehe oben).
- Banner-Charakter-Erkennung ist Namens-Matching auf Text, kein strukturiertes Feld.
- `isZenkai` wird aus dem Vorhandensein der Zenkai-Sektion auf der Detailseite
  abgeleitet (best effort, siehe `apps/scraper/src/dblegends.ts`).
- Ein voller Scrape aller ~780 Charaktere dauert einige Minuten – für den
  täglichen Gebrauch empfiehlt sich ein geplanter Job statt manuellem Aufruf.
- Die Detailkarten-Artworks nutzen `card_m_icons` von dblegends.net (mittlere
  Auflösung); volle Layered-Art wird nicht gezogen.
