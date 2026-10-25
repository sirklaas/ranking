# Ranking Project Changelog & Log

## Version 9.4.13 (2026-10-25)
- **Top 3 Phone Layout 2-Column Grid & Styling Upgrade:**
  - **2 Kolommen Gradient Blokken:** De kandidatenlijst op de telefoon is opgebouwd in een 2-koloms raster (`grid grid-cols-2 gap-2.5`). Elk naam-blok heeft de zachte pastel gradient gekregen (`bg-gradient-to-r from-pink-300 to-purple-400` met `text-gray-800`), identiek aan de onboarding naamkeuze.
  - **Verfijnde 1px Witte Rand:** De omlijning is subtieler en eleganter gemaakt met een lichte 1px rand (`border border-white/80`) in plaats van de zware 2px rand.
  - **Blauwe Tickbox in "Je hebt gestemd":** Het groene `✅` icoon is vervangen door een moderne blauwe tickbox (`w-16 h-16 rounded-2xl bg-blue-600 border border-white/40`) met een strakke witte checkmark SVG.
  - **Typografie (Barlow 400):** Heading (*"KIES IEMAND!"*), subtitel en bevestigingsscherm (*"JE HEBT GESTEMD!"*) gebruiken strikt `Barlow Semi Condensed 400` in hoofdletters.

## Version 9.4.12 (2026-10-24)
- **Top 3 Phone Voting Fix & Instant Voting Mode:**
  - **Auto-Open Voting on Question Slides:** Top 3 question slides (`10/05` t/m `10/13`) start directly in `'voting'` phase. Players on their phones immediately see the full list of candidates to vote for without requiring the presenter to press 'V'.
  - **Player Pool Synchronization:** Top 3 player list prioritizes all active session players from `currentSession.playernames` (20 spelers), eliminating issues where outdated or partial state arrays hid player choices.
  - **Self-Vote Filter:** Cleaned candidate filtering with `formatName(name).toLowerCase() !== cleanPlayerName` so the voting list neatly hides the logged-in player's own name (e.g. Olivia cannot vote for herself) while displaying all other candidates cleanly without numeric prefixes (`William`, `Emma`, etc.).
  - **Fase Transitions & Vote Reset:** Advancing to the next question automatically resets local `submitted` and `selected` states and clears previous votes so players immediately see candidates for the next question.
  - **API Vote Handling:** `/api/top3-vote` now accepts votes reliably on active question slides and prevents mutations once in `'results'` phase.

## Version 9.4.11 (2026-10-24)
- **1 Telefoon = 1 Speler Flow & Display Sync:**
  - **Telefoon (`/player`):** Zodra een speler zijn naam kiest, verdwijnen alle andere namen direct van zijn scherm. Hij ziet enkel nog zijn bevestigde team en naam (*"Je bent ingelogd!"*). De naam wordt direct opgeslagen in `joined_players` in PocketBase en gefilterd voor andere telefoons in dat team.
  - **Display (`/display`):**
    - Subtiele blauwe stip (`w-3 h-3 bg-blue-600`) in de rechterbenedenhoek van de spelerskaart zodra hij ingelogd is. Rustig en subtiel: geen knipperen, geen afwijkende kaders.
    - Barlow Semi Condensed strikt op gewicht `400` ingesteld op alle kaarten en teksten.
    - Subtitel direct onder de rechthoeken geplaatst: *"Iedereen in het juiste team!"* (`Barlow Semi Condensed 400`).
    - Kaarten gecompacteerd zodat het hele scherm binnen `100vh` past zonder afkapping door `overflow-hidden`.
  - **PhotoCircle Uitfasering:** Volledig overgezet naar eigen TeamX mediasysteem. Photocircle verplichting verwijderd uit sessie-aanmaak; fase `01/06` heet *"Maak een Teamfoto met je hele team!"*.
  - **Obsidian Archivering:** Alle regels, concepten en fasestructuur vastgelegd in `/Users/mac/Vault/03 Projects/RankingNW.md`.

## Version 9.4.10 (2026-10-24)
- **Automatic Mobile Redirect to `/player` from Root `/`:**
  - Added user agent and viewport width detection on the root landing page (`/`) to automatically redirect iPhones and mobile devices straight to `/player` (preserving query params).
  - Prevents players from seeing developer cards/URLs (`/presenter`, `/player`, `/display`, `/me/...`) when typing `ranking.pinkmilk.eu`.
  - Bumped version to `v9.4.10`.

## Version 9.4.9 (2026-10-24)
- **Two-State Reveal Orientation (Portrait 90° Tilt / Landscape No Tilt):**
  - **Portrait State:** Signs are rotated 90 degrees (`translate(-50%, -50%) rotate(90deg)`) spanning `85vh` length by `85vw` width with a 6px white border. This forces users to hold their phone in landscape orientation when showing it to the 80-person audience, making the text upright and massive.
  - **Landscape State:** When the browser viewport rotates into landscape (or when physically turned without orientation lock), tilt is disabled (`transform: none`) so the sign sits upright and wide at `85vw` by `85vh` without double-rotation.
  - Implemented both via React orientation tracking (`resize` / `orientationchange`) and CSS `@media (orientation: landscape/portrait)`.
  - Bumped version to `v9.4.9`.

## Version 9.4.8 (2026-10-23)
- **Natural Device Orientation for Reveal Container:**
  - Removed artificial CSS `transform: rotate(90deg)` so the phone can be held naturally in portrait or turned physically to landscape without the text appearing sideways.
  - Sized container to `85vw` width by `85vh` height (`border: 6px solid #FFFFFF`).
  - In portrait: spans 85% width and 85% height of the portrait screen.
  - In landscape: when turned horizontally to show 80 people, it spans 85% width and 85% height of the landscape screen with upright, huge Barlow Semi Condensed 500 text.
  - Bumped version to `v9.4.8`.

## Version 9.4.7 (2026-10-23)
- **Krakende Reveal Screen Absolute Full-Height Geometry:**
  - Resolved flexbox container squashing the rotated element's width (which made it appear like a 330px square).
  - Switched rotated container to absolute positioning (`position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(90deg)`).
  - Explicitly locked container dimensions to `85vh` length (span of the phone height) and `85vw` width with `minWidth`/`maxWidth`, guaranteeing a full-height rectangular sign covering 85% of the phone screen.
  - Bumped version to `v9.4.7`.

## Version 9.4.6 (2026-10-23)
- **Inline WebKit/CSS Rotation & Guaranteed Barlow 500 Font Delivery:**
  - Fixed mobile Safari ignoring Tailwind `rotate-90` by directly applying `transform: rotate(90deg)` and `-webkit-transform: rotate(90deg)` with explicit transform origins in inline styles.
  - Sized container to `85vh` width by `85vw` height rotated 90 degrees so the text fits along the full height of the device.
  - Set text color to `#1f2937` with weight `500` (Barlow Semi Condensed 500) and injected `<link>` tags directly into `PlayerPage` and `KrakendePlayer` to guarantee font delivery on iOS Safari and Android Chrome.
  - Fixed CSS `@import` order in `globals.css` so Google Fonts `@import` is parsed before Tailwind.
  - Bumped version to `v9.4.6`.

## Version 9.4.5 (2026-10-23)
- **Krakende Rotated Reveal Sign (90° Rotation + Barlow 500):**
  - Rotated the reveal container 90 degrees (`rotate-90 origin-center`) spanning `85dvh` width by `85dvw` height across the long edge of the phone.
  - Switched font weight from 900 to `500` (Barlow Semi Condensed 500).
  - Maximized font size across the rotated dimensions (`clamp(3rem, min(...), 11rem)`), providing nearly double the horizontal display area so words appear massive when the phone is held up for 80 people.
  - Bumped version to `v9.4.5`.

## Version 9.4.4 (2026-10-23)
- **Krakende Reveal Screen for 80-Person Audience Visibility:**
  - Designed the positive & negative reveal container to be exactly 85% wide (`w-[85vw]`) and 85% high (`h-[85vh]`).
  - Added a prominent 6px solid pure white border (`border: '6px solid #FFFFFF'`) with a glowing white drop shadow.
  - Formatted the trait text inside using `Barlow Semi Condensed` weight 900 (ultra bold black), uppercase, tight leading (`0.98`), dynamically clamped to the maximum possible font size so it is clearly legible across a crowded room of 80 people.
  - Used high-contrast vibrant yellow gradient (`#fef08a` to `#fed766`) for positives and energetic orange gradient (`#fed7aa` to `#fb923c`) for negatives with pitch black text.
  - Reduced reveal readiness delay from 6s to 1s.
  - Bumped version to `v9.4.4`.

## Version 9.4.3 (2026-10-23)
- **Barlow Semi Condensed Font Delivery:**
  - Added `next/font/google` Barlow_Semi_Condensed loader to `src/app/layout.tsx` so font files are optimized, self-hosted, and loaded on all mobile browsers (iOS Safari, Android Chrome).
  - Added Google Font CDN `<link>` preconnect in `<head>` and `@import url` in `globals.css` as layered fallback.
  - Set default body font to `var(--font-barlow), 'Barlow Semi Condensed', sans-serif`.
  - Bumped version to `v9.4.3`.

## Version 9.4.2 (2026-10-23)

### Phone App (Player)
- **Presenter Synchronization in Intro (01/01 – 01/07):**
  - Connected `currentSession.current_fase` directly to phone onboarding phases so the phone automatically follows the presenter's lead.
  - `01/01`: 'In welk team zit je?' team selection input.
  - `01/02`: PhotoCircle account check ('Heb je een PhotoCircle account aangemaakt?'). Shows confirmation state (`✅ PhotoCircle account bevestigd!`) once selected and waits for presenter.
  - `01/03`: 'Wat is jouw naam?' player selection screen. Includes fallback team selector if joined late.
  - `01/04`: 'Wat wordt jullie Teamnaam?' team briefing card.
  - `01/05`: 'Wat wordt jullie Teamyell? Kort maar Krachtig' team briefing card.
  - `01/06`: 'Maak een Selfie Video en upload die naar PhotoCircle' team briefing card.
  - `01/07`: 'Wie kies jij als Teamleider?' voting buttons.
  - Automatic transition to game modules as soon as presenter advances past `01/*`.
- **Top 3 & Top 10 Fixes:**
  - Resolved `TypeError: undefined is not an object (evaluating 'e.allPlayerNames.filter')` on phones.
  - Added safe parsing and fallbacks for `playerPool`, `allPlayerNames`, and `localStorage`.
- **Typography & Layout:**
  - Standardized font on `Barlow Semi Condensed` across all views.
  - Removed persistent 'Afmelden' button from player screen.
  - Clamped reveal screen dimensions (`w-[88dvh] h-[85dvw]`) in Krakende Karakters to prevent cutoff on mobile screens.

### Krakende Karakters (13/*)
- **Presenter Screen:**
  - Removed the 24-trait keynote replica grid ("eigenschappen container") from the presenter view.
  - Removed the 16:9 black preview container underneath the controls.
  - Retained the top phase controls (1: 24 Goede, 2: 24 Minder Goede, 3: Goede Resultaten, 4: Minder Goede Resultaten), Gestemd counter, and Reset button.
- **Display Screen:**
  - Removed pre-render tile shadows (`opacity-0 pointer-events-none`) to prevent ghost rectangles during initial load.
  - Set headings font to Barlow Semi Condensed 400.
- **Player Screen:**
  - Tile styling updated to presenter yellow gradient with dark grey text in single line.

### Zitten en Staan (07/*)
- **Stellingen & Headings:**
  - Standardized two-line splitting with `/n` / `/N` across all stellingen.
  - Updated `07/06` stelling to: `Ik flirt soms /n om iets te krijgen`.
  - Updated `07/01` trailer heading to: `Blijf staan als je het eens /n bent met de volgende stelling:`.
  - Updated `07/11` grammar to: `Sauna /n Ik vind dat zo vies`.
  - Case-insensitive `/n` regex parsing across pocketbase, presenter, and player views.
  - Phone stelling reveal delayed to match video durations (~14.5s – 22s).

### Top 3 (10/*)
- **Trailer Screen:**
  - Suppressed the "Kies iemand..." heading overlay on Display during the `10/01` trailer.

### Version Alignment
- Bumped all sub-applications (Player, Presenter, Display, Test, and package.json) to `v9.4.2`.
