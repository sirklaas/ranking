# Master Plan: Ranking Platform — QDE Migratie, Standaard Engine Upgrade & Merry Christmas Editie

> **Datum:** 30 oktober 2026  
> **Doel:** Drieledige transformatie van het Ranking-platform voor maximale stabiliteit, herbruikbaarheid en seizoensthema's.  
> **Uitvoering:** Gepland voor vannacht.

---

## 1. De Drie Pijlers van de Operatie

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RANKING PLATFORM 2026                           │
└────────────────────────────────────────────────────────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
   [ PIJLER 1 ]              [ PIJLER 2 ]              [ PIJLER 3 ]
  Volledig op QDE         Standaard Ranking        Merry Christmas Show
 (Geen HostSlim meer)     (Engine Sync main)      (Kerst Editie Branch)
```

---

## Pijler 1: Show Volledig op QDE Draaien (Infrastructuur)

### 1.1 Doelstelling
De fatale afhankelijkheid van HostSlim (`103.214.6.202`) definitief beëindigen. Zowel Next.js, PocketBase als alle media/Photo App assets draaien lokaal op **QDE** (`45.148.62.92`). Vercel blijft stand-by als wereldwijde fallback.

### 1.2 Architectuur op QDE
1. **Next.js Frontend & API:**
   * Standalone Docker container op QDE (`127.0.0.1:3000`).
   * Interne connectie naar PocketBase via `http://127.0.0.1:8090` (0 ms latency).
2. **Media & Photo App Hosting:**
   * Bestanden gespiegeld van HostSlim naar `/var/www/ranking-media/`.
   * Geserveerd direct door Nginx met gzip/brotli en HTTP/2 caching.
3. **Directe Lokale Uploads:**
   * `src/app/api/ftp-upload/route.ts` geoptimaliseerd: slaat bestanden lokaal op als de app op QDE draait, zonder trage netwerk-FTP.
4. **DNS Omzetting (DirectAdmin API):**
   * `halloween.pinkmilk.eu` $\rightarrow$ `45.148.62.92`
   * `ranking.pinkmilk.eu` $\rightarrow$ `45.148.62.92`
   * `christmas.pinkmilk.eu` $\rightarrow$ `45.148.62.92`
5. **Geautomatiseerde Database Backups:**
   * Dagelijkse SQLite snapshot cronjob van PocketBase naar `/var/backups/pocketbase/`.

*Zie voor het gedetailleerde handoff-draaiboek:* [`show op qde.md`](./show%20op%20qde.md)

---

## Pijler 2: Standaard Ranking (`main`) Upgraden naar de Halloween Engine

### 2.1 Doelstelling
Alle rotsvaste motor-verbeteringen (versie `v9.4.32` t/m `v9.4.51`) die tijdens de live shows zijn beproefd, doorvoeren in de standaardversie (`origin/main`), **ZONDER** de Halloween graphics, horror-karakters of afwijkende vragen over te nemen.

### 2.2 Wat wél wordt gemigreerd (De "Engine"):
* **Stem Concurrency Veiligheid (Oplossing A):**
  * Post-write read verification in `top3-vote` en `top10-vote`.
  * Automatische retry met jittered backoff (60-180ms) bij gelijktijdige stemmen vanaf meerdere telefoons.
* **Presenter Viewport Strict No-Scroll:**
  * `overflow-hidden` constraints op MacBook schermen.
  * 4x2 grid indeling in De Finale (`grid-cols-4 grid-rows-2`).
  * Slanke top header en actiebalken; 100% passend op 13", 14" en 16" MacBooks.
* **Display Audio Beleid (Mute & Zaalgeluid):**
  * Beamer/TV display video's permanent gedempt (`muted = true`).
  * Al het geluid (video audio, soundboard, effecten) loopt vanaf de Presenter MacBook naar de versterker.
  * MacBook Audio knop `[🔊 MacBook Audio: AAN/UIT]` op Presenter.
* **WebKit / Safari Autoplay Beveiliging:**
  * Native zwarte Play-knoppen onderdrukt via WebKit pseudo-selectors.
  * Directe DOM-initialisatie met `defaultMuted` en expliciete HTML-attributen.
* **Draadloze Flic 2 Remote Trigger:**
  * Dedicated API endpoint `/api/remote?action=next/prev`.
  * Toetsenbord-sneltoetsen `'1'` en `'2'`.
* **Zitten & Staan Stem-API:**
  * Dedicated server-side route `/api/zitten-vote` inclusief automatische opschoning per slide.
* **Photo App Teamnummer Resolutie:**
  * Spelertelefoons tonen dynamisch `[ Team X ]` alleen wanneer een team gekozen is.

### 2.3 Wat strikt STANDAARD blijft (Niet overschrijven!):
* **Karakters & Finale Kaarten:** De 8 originele gouden/paarse kaarten (`creatief`, `doorzetter`, `wreed`, `dapper`, `bedriegelijk`, `beschermend`, `vreugdevol`, `sinister`).
* **Vragen & Inhoud (`fases.json`):** De standaard dilemma's en teksten voor De Top 3 en De Top 10.
* **Trailers & Video's:** `TrailerTop3.mp4`, `Top10.mp4`, `TrailerZitten.mp4`, `KrakendeKarakters.mp4`, `end.m4v`.
* **Thema & Styling:** Het vertrouwde gouden, paarse en blauwe BrewHouse-kleurenpalet.

---

## Pijler 3: Merry Christmas Ranking Editie

### 3.1 Doelstelling
Een gloednieuwe, sfeervolle Kerst-editie van Ranking the Starzzz opzetten op een dedicated Git branch `christmas`, aangedreven door exact dezelfde robuuste engine.

### 3.2 Aanwezige Assets (`Merry/`)
* Trailer video: `Merry/merry-christmas-ranking-show-trailer.mp4`
* Trailer samenstellingen: `Merry/christmas-ranking-trailer/`
* Afbeeldingen en elementen: `Merry/christmas-ranking-trailer/assets/`

### 3.3 Kerst Inhoud & Customization
1. **De Finale Kerstkaarten (8 unieke feestdagen-rollen):**
   * Bijvoorbeeld: *De Kerstman, De Grinch, Rudolph, De Kerstengel, De Sneeuwpop, De Scrooge, De Feestganger, De Chefkok*.
   * Elk met feestelijke munten-uitkomsten (halveren, verdubbelen, munten uitdelen).
2. **Top 3 & Top 10 Kerst-dilemma's:**
   * Vragen rondom kerstdiners, cadeautjesstress, foute kersttruien, glühwein en goede voornemens.
3. **Visuele Kerstsfeer:**
   * Sneeuw- en glinster-effecten op Display (geïnspireerd op de sintels van Halloween).
   * Feestelijk kleurenpalet: dieprood, dennengroen, warm goud en ijsblauw.
4. **Domeinen & Deployment:**
   * `https://christmas.pinkmilk.eu` & `https://kerst.pinkmilk.eu`.

---

## 4. Fasering & Tijdsinschatting voor Vannacht

| Fase | Onderdeel | Geschatte Duur | Risico |
| :--- | :--- | :--- | :--- |
| **Fase 1** | QDE Standalone Docker & Media Setup | 30 - 40 min | Laag (QDE draait al) |
| **Fase 2** | DNS omschakeling naar QDE | 10 min | Laag (Vercel als backup) |
| **Fase 3** | Engine sync naar Standaard `main` | 30 - 45 min | Laag (strikt engine/geen media) |
| **Fase 4** | Branch `christmas` opzetten & Merry assets koppelen | 45 - 60 min | Laag (geïsoleerde branch) |
| **Fase 5** | End-to-end verificatie alle 3 de shows | 20 min | Geen |
