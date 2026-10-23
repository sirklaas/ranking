# Ranking Project Changelog & Log

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
