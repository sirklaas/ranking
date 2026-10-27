# Ranking Project Changelog & Log

## Version 9.4.33 (2026-10-27)
- **De Finale — Trailer bij Binnenkomst, Daarna Grid View:**
  - Bij het openen van De Finale (20/01) start direct de creepy finale trailer (`trailercreepy.m4v`) met titelkaart *"FNUIKENDE FINALE"*.
  - Audio speelt vanaf de MacBook via de Presenter naar de zaalspeakers; beamer blijft stil.
  - Zodra de trailer afloopt of wordt overgeslagen (`→` / Overslaan), verschijnt direct het **8-kaarten grid view**.
  - Presenter heeft een `[🎬 Trailer]` knop om de trailer op elk moment opnieuw te starten.
  - Kaart kiezen -> dichte kaart groot in beeld -> `→` onthult met audio -> `→` keert terug naar grid met greyed-out kaart.

## Version 9.4.32 (2026-10-27)
- **De Finale — Kaart Selecteren Onthult NIET Automatisch:**
  - Klikken op een kaart in het grid selecteert de kaart en toont deze groot en intact in het midden van het scherm (`playbackState: 'paused'`), ZONDER te onthullen.
  - Pas wanneer de presentator op de rechter pijltoets (`→` / ArrowRight) drukt of op `[✨ Start Reveal (→)]` klikt, start de reveal animatie met geluid.
  - Na de reveal blijft het gouden ticket met de uitkomsttekst permanent op het scherm staan.
  - Een tweede druk op de rechter pijltoets (`→`) keert terug naar het 8-kaarten grid, waarbij de gespeelde kaart grijs (`greyed out`) is.

## Version 9.4.31 (2026-10-27)
- **Display 100% Stil & Geen Audio-Knoppen:**
  - `isMuted={true}` expliciet doorgegeven aan `CodedEndgameReveal` in `DisplayView.tsx`.
  - Display probeert geen audio meer af te spelen via de beamer, waardoor Safari geen autoplay blokkeert.
  - De oranje knop *"🔊 KLIK VOOR GELUID"* verschijnt nu nooit meer op het display. Alle audio speelt exclusief via Presenter op de MacBook.

## Version 9.4.30 (2026-10-27)
- **De Finale — Reveal Blijft Onbeperkt Staan Tot Pijltje Rechts:**
  - Klikken op een kaart start direct de coded reveal met audio (`playbackState: 'playing'`).
  - Oorzaak opgelost waarbij het scherm na 14s terugviel naar de kaartafbeelding: de animatie houdt de onthulde uitkomst (het gouden ticket met uitkomsttekst) nu permanent vast.
  - Bij het drukken op de rechter pijltoets (`→` / ArrowRight) keert het scherm direct terug naar het 8-kaarten grid, waarbij de gespeelde kaart netjes grijs/inactief (`greyed out`) is.
  - Sneltoets conflict in `presenter/page.tsx` verholpen: ArrowRight op fase 20/01 stuurt geen slide wissel meer, maar bedient exclusief de finale-kaartstappen.

## Version 9.4.29 (2026-10-27)
- **De Finale — 8 Kaarten Eerste Weergave op Display:**
  - Display toont bij binnenkomst in De Finale (20/01) direct het 8-kaarten grid als eerste weergave (geen storende video-overlay en geen achtergebleven "Betoverd" reveal).
  - Sync verbeterd: Display laadt geen verouderde `selectedCard` uit localStorage meer op mount, maar start op het schone kaartenoverzicht conform de sessiestatus.
  - Reset Game Data wist nu ook `ranking_endgame_state` in localStorage en zet de sessie terug op de schone 8-kaarten grid.
- **Presenter Video Stabiliteit (Geen herstart na 10s):**
  - Oorzaak opgelost waarbij de trailer in Presenter na ~10s spontaan herstartte: `playedFaseRef` controleert of de fase daadwerkelijk is gewisseld voordat `currentTime = 0` wordt aangeroepen.
  - `currentTime = 0` verwijderd uit `onLoadedMetadata` zodat her-renders van het video-element tijdens het afspelen de positie niet meer resetten.

## Version 9.4.28 (2026-10-27)
- **De Finale — Eenvoudige Werkende Telefoonversie Hersteld:**
  - Teamleider stemmen op de telefoon volledig verwijderd conform wens van Klaas.
  - Spelersschermen tonen tijdens De Finale betrouwbaar de titelkaart met *"Kijk naar het grote scherm"*.
  - Pas wanneer de presentator op `'e'` of de End Card knop drukt, verschijnt op de telefoons het feestelijke scherm ("Bedankt voor het spelen!", sterren geven, en Photo App koppeling).
- **De Finale — Trailer Asset Path Fix:**
  - `trailercreepy.m4v` gekopieerd naar zowel `/pics/HaloweenTrailer/trailercreepy.m4v` als `/pics/trailercreepy.m4v` met automatische fallback onError.
- **De Finale — End Card & Lawineboys Uitsluitend op 'e' / Knop:**
  - QR Code en feestnummer *"Wat zullen we drinken"* (Lawineboys) activeren uitsluitend via de knop `[🎬 Show End Card (e)]` of sneltoets `'e'` / `'E'`.
  - Geluid speelt exclusief af via de Presenter op de MacBook naar de versterker, Display blijft stil.


## Version 9.4.27 (2026-10-27)
- **100% Permanente Display Muting (Geen Dubbel Geluid / Geen Echo):**
  - Display beamer scherm (`/display`, `Top10Display`, `Top3Display`, `Zitten en Staan DisplayView`, `De Finale DisplayView`) is nu 100% permanent gedempt (`muted={true}`, `volume = 0`).
  - Alle automatische en interactieve unmuting logic verwijderd op het display.
  - Alleen het Presenter dashboard op de MacBook speelt de show audio af rechtstreeks naar de versterker/speakers. Geen overlap of faseverschuiving meer mogelijk.
- **Zitten en Staan — Automatische Nulstand op Nieuwe Slide:**
  - Zodra de presentator naar een nieuwe slide/stelling gaat, wordt alle data voor die slide direct gewist in PocketBase (`DELETE /api/zitten-vote?fase=...`).
  - Zowel in `DisplayView.tsx` als `display/page.tsx` springt de teller op het scherm direct naar 0 bij elke slide wissel.
- **Zitten en Staan — Tellers Dubbel Zo Groot:**
  - Formaat van de rode en blauwe afgeronde rechthoeken verdubbeld naar `w-16 h-16 md:w-20 md:h-20` (64px / 80px) met `text-2xl md:text-3xl` bold cijfers.
  - Blijft zonder woorden ("Rood" en "Blauw" weggelaten).


## Version 9.4.26 (2026-10-27)
- **Audio Routing & Stabiliteit:**
  - MacBook audio-uitgang (3.5mm jack / audio interface) naar de zaalspeakers/versterker is de exclusieve audiobron.
  - Presenter speelt altijd alle fase-audio, media-audio en trailers direct af.
  - Display beamer scherm is 100% stil (`muted`) en start direct schoon zonder storende START-overlays.
  - MP4 video's geoptimaliseerd met `moov` faststart atom aan het begin voor directe start zonder bufferen.
- **Zitten & Staan (Fase 07/*):**
  - **Trailer 07/01**: Titel aangepast naar exact `"Zitten & Staan"`. Tellers worden expliciet NIET getoond op de trailer.
  - **Display tellers**: Halve formaat mini tellers (`w-8 h-8 md:w-9 md:h-9`), woorden `"Rood"` en `"Blauw"` verwijderd (alleen getallen in subtiele pill).
  - **Telefoons**: Alle counter rectangles (stemscherm en bevestigingsscherm) en polling verwijderd. Telefoon toont uitsluitend de Oneens / Eens knoppen.
  - **Data reset**: PocketBase `zitten_votes` collectie opgeschoond en gekoppeld aan de "Reset Game Data" knop zodat spookstemmen verdwijnen.


## Version 9.4.20 (2026-10-25)
- **Native Endgame Finale Module (`fase 20/01`)**:
  - Volledig geïntegreerd in Ranking zonder externe redirects naar `end.pinkmilk.eu`.
  - **Presenter**: Bevat het grid van 8 kaarten (Bedrieglijk, Beschermend, Creatief, Dapper, Doorzetter, Sinister, Vreugdevol, Wreed), interactieve kaartselectie, `→` om video te starten (audio op presenter), `→` om terug te keren naar het grid en kaart als gespeeld te markeren, `Show End Title` knop (`end.m4v` + `Lawineboys.m4a`), en `Reset All`.
  - **Display**: Synchroon met presenter. Toont grid van 8 kaarten; toont fullscreen first frame bij gepauzeerde kaart; speelt fullscreen video af bij speelstatus; schakelt over naar looping `end.m4v` bij endtitle; meldt aan PocketBase zodra de video klaar is (`playbackState: finished`).
  - **Telefoon (Spelers)**:
    - **Teamleider**: Ziet het grid met de 8 kaarten en kiest één kaart voor het team via touch.
    - **Teamleden**: Zien in eerste instantie een wachtscherm dat de teamleider kiest; zodra de teamleider heeft gekozen zien teamleden **uitsluitend die ene gekozen kaart**.
    - **Onthulling/Reveal**: Pas **nadat de display-video is afgelopen** toont de telefoon de feestelijke onthulling ("✨ ONTHULD VOOR TEAM X!").
- **Optie A (TeamX Admin als Master)**:
  - In TeamX Admin (`teaminput`): extra sectie `[🎮 Ranking Koppeling]` toegevoegd op show-blokken.
  - Maakt het mogelijk direct een Excel met spelersnamen te uploaden en met één klik de sessie aan te maken/updaten in de `ranking` PocketBase collectie (priority 1).
  - Koppelt automatisch het geldige TeamX show-ID aan `photocircle` (`media.html?showId=<id>`) zodat de Photo App zonder relatie-fouten foto's en video's uploadt.
  - TeamX blijft 100% onaangetast en veilig.

## Version 9.4.19 (2026-10-25)
- **Zitten en Staan Phone React Hook Fix:**
  - Opgelost: De vroege return voor de trailer op `07/01` stond vóór de `useState`, `useRef` en `useEffect` hooks, wat in Next.js/React leidde tot een *"Rendered fewer hooks than expected"* runtime error. Alle hooks staan nu conform React-standaarden bovenaan.
- **Ranking Logo Band op Telefoons tijdens Trailers:**
  - `TrailerTitleCard` toont nu aan de bovenkant van het telefoonscherm de officiële Ranking logo-band (`/assets/band.webp` + `/assets/ranking_logo.webp`).
- **Top 3 & Top 10 Display Dynamic Clamping & Riser Sound:**
  - **Dynamische Font-Clamping per Vraag:** Vragen worden nu op basis van de lengte van de langste regel dynamisch geschaald (`clamp(62px, 6.8vw, 118px)` voor korte vragen, `clamp(48px, 5.2vw, 94px)` voor middellange vragen) en benutten tot `96vw` van de schermbreedte.
  - **Cinematische Donut Riser Sound:** Zodra de Animated Donut in Top 3 ontvouwt (2.5s animatie), klinkt via de Web Audio API een cinematische spanning-riser (oplopende resonantie en pitch van 70Hz naar 480Hz) met een impact-climax zodra de donut compleet is.
- **Top 10 Telefoon — 2-Koloms Gradient Grid (Top 3 Look & Feel):**
  - De enkelvoudige lijst op de telefoon is vervangen door exact hetzelfde 2-koloms gradient grid als in Top 3 (`grid grid-cols-2 gap-2.5`, pastel gradient blokken, 1px witte rand, custom radio-indicator en Barlow 400).
- **Top 10 Display WordCloud — 90° Rotatie, Barlow 400 & Bottom Margin:**
  - **90° Rotatie Hersteld:** De #1 winnaar blijft dominant horizontaal (0°), de #2 draait verticaal (-90°), en de overige namen wisselen 50/50 af.
  - **Strikt Barlow 400:** De namen in de moderne glazen pills gebruiken nu `font-weight: 400` conform design-regels.
  - **Gegarandeerde Bottom Margin:** De WordCloud houdt nu een strikte onder-marge van `clamp(95px, 13vh, 125px)` aan, zodat pillen nooit overlappen met de `x/20 gestemd` statusbalk.

## Version 9.4.18 (2026-10-25)
- **Top 3 & Top 10 Display Layout & Heading Clamping:**
  - **Gereserveerde Hoogte & Hogere Startpositie:** De koppen starten nu hoger op het scherm (`top: clamp(16px, 2.8vh, 36px)`) in een gereserveerde container (`clamp(110px, 17vh, 160px)`).
  - **Donut & WordCloud onder de Kop:** De Animated Donut (Top 3) en de WordCloud (Top 10) zijn strikt gepositioneerd vanaf `clamp(140px, 20vh, 180px)`, waardoor koppen en grafieken elkaar nooit meer overlappen.
  - **Responsieve Font & Breedte Clamp:** Koppen gebruiken nu `clamp(36px, 4.4vw, 78px)` met `max-w-[92vw] mx-auto`, zodat lange teksten nooit meer aan de rechterkant van het scherm afsnijden.
- **Top 10 Display & WordCloud Modernisering:**
  - **Centrering van de WordCloud:** Tijdens het stemmen (`voting`) vult de WordCloud het volledige scherm en staat 100% horizontaal en verticaal gecentreerd. Pas bij `results` verschijnt de Top 5 aan de linkerkant en schuift de cloud soepel naar de rechter 70%.
  - **Moderne Vloeiende Pill-Animatie:** Ouderwetse verticale (-90°) tekst is vervangen door moderne, horizontale semi-transparante glazen pills met een subtiele neon glow en rank-styling (#1 gouden rand & gloed).
  - **Geen Overlappende Namen:** D3 collision physics berekent nu de werkelijke bounding box per speler (`Math.hypot(pillW / 2, pillH / 2)`), waardoor namen elkaar fysiek nooit meer kunnen overlappen.
  - **Verwijderen "Kies een ander" & Sla 17/02 over:** De oude introductiedia `17/02` is volledig uit de presentator- en displaynavigatie gehaald; na de trailer `17/01` gaat de show direct door naar de eerste vraag (`17/05`).
- **Top 10 Phone Stemlijst Filters:**
  - De speler ziet op zijn telefoon **niet** zijn eigen naam en **alleen namen van andere teams** (teamgenoten van het eigen team worden automatisch weggefilterd).
- **Universele Trailer Title Cards op Telefoons:**
  - Zodra er een trailer/introvideo speelt (`07/01` Zitten & Staan, `10/01` Top 3, `13/01` Krakende Karakters, `17/01` Top 10, `20/01` De Finale), toont de telefoon nu een stijlvolle geanimeerde show-titelkaart met glowing badge en de subtitel *"Kijk naar het grote scherm"*.
- **Krakende Karakters Reveal Kaart (Positief / Negatief):**
  - **Strikte Barlow 900:** De getoonde eigenschappen gebruiken nu `font-weight: 900` (black/bold) in plaats van de dunne 400/500 variant.
  - **Geen Afgebroken Woorden / 3 Regels:** `word-break: break-word` is vervangen door `white-space: nowrap` en dynamische font-scaling; woorden als "Ongeduldig" of "Geweldig" breken nooit meer af over 3 regels.

## Version 9.4.17 (2026-10-25)
- **Eigen PhotoApp Link op Fase 01/06:**
  - De link naar PhotoCircle is op `/player` vervangen door de eigen PinkMilk PhotoApp:
    `https://www.pinkmilk.eu/phone/media.html?showId=${currentSession.id}&playerName=${playerName}&team=${teamNumber}`
  - Spelers openen via de knop `Photo App [ Team X ]` direct de gepersonaliseerde media-uploader met automatische toewijzing aan hun sessie, naam en team.
- **Herstel Fase 01/07 ("Wie is jullie Teamleider?") in Presenter Preview & Phone Stemflow:**
  - **Presenter "Next" Preview Fix:** `getNextMedia()` in `/presenter` zocht voorheen enkel naar dia's met een gevulde `image`/video-bestandsnaam. Omdat fase `01/07` geen media-bestand heeft (`image: ''`), werd deze dia overgeslagen en toonde de preview ten onrechte `07/01` (Zitten en Staan).
  - De logica is gerefactord om strikt naar de direct opvolgende fase (`getNextFaseGlobal(currentFase)`) te kijken. Voor dia's zonder media rendert de preview nu een strakke weergave: *"Fase 01/07 (Volgende) - Wie is jullie Teamleider?"*.
  - **Telefoon Stembevestiging op 01/07:** Zodra een speler stemt op zijn teamleider, toont de telefoon nu net als bij Top 3 een heldere bevestigingskaart met een blauwe tickbox (`bg-blue-600`), de gekozen naam in geel en de tekst *"Je hebt gestemd op: [Naam] - Teamleider Team X - Kijk op het grote scherm voor de uitslag!"*.

## Version 9.4.16 (2026-10-25)
- **Reset Game Data Knop op Presentator Scherm & Display Dots Reset op 01/01:**
  - **Presentator "Reset Game Data" Knop:**
    - Op `/presenter` in fase `01/01` (bovenbalk game-interface) én in het Setup scherm (naast *Start Ranking game*) is een rode knop **`[🗑️ Reset Game Data (01/01)]`** toegevoegd.
    - Met één klik wist deze direct alle aangemelde spelers (`joined_players`), teamleiderstemmen (`teamleaders`) en tussenstatussen (`top3_state`, `top10_state`, `krakende_state`) in PocketBase en de server cache.
  - **Display Reset op 01/01:**
    - Zodra de presentator naar fase `01/01` navigeert, of wanneer het grote scherm (`/display`) opent op `01/01`, worden alle achtergebleven blauwe stippen van eerdere test- of speelrondes direct gewist.
    - Bij faseovergang naar `01/01` reset PocketBase `joined_players: []` automatisch via `PATCH /api/session-state`.

## Version 9.4.15 (2026-10-25)
- **Fase 01/01 Teamknoppen & Dynamic Heading Transitions:**
  - **Team Selectie Knoppen i.p.v. Input:** De numerieke invoer en het `?` cirkeltje zijn vervangen door responsieve teamknoppen in show-badge stijl (witte cirkel met dikke zwarte rand en opvallend roze cijfer).
  - **Dynamische Schaalbaarheid:** Het raster past zich automatisch aan het aantal teams (`nr_teams`) aan (2 kolommen bij 4 teams, 3 kolommen bij 6 teams, 4 kolommen bij 8+ teams), waardoor de knoppen altijd 100% passend op elk telefoonscherm blijven zonder scrollen.
  - **Confirm & Herstel Controls:**
    - Tikken op een teamnummer highlight de knop met een gele ring (`ring-4 ring-yellow-400 bg-yellow-50`).
    - Daaronder verschijnt een grote donkerblauwe bevestigknop (*"Bevestig Team X"* in `#0A1752` met witte rand) en een hersteloptie (*"Kies een ander team"*).
    - Bevestigen brengt de speler naar de namenlijst met een vloeiende typewriter-kopovergang: *"In welk team zit je?"* -> *"Hoe heet je ?"*.
    - In het namenscherm is tevens een subtiele terugknop toegevoegd (*"← Kies een ander team"*), zodat een verkeerde keuze altijd direct gecorrigeerd kan worden.
- **Automatische LocalStorage Reset op 01/01:**
  - Zodra de sessie op fase `01/01` staat (of wanneer de telefoon op `01/01` opent), wordt `localStorage` op de telefoon automatisch gewist. Spelers starten zo bij elke nieuwe introductie altijd met een schone lei bij de teamselectie.
- **Fase 01/06 Selfie Video & Photo App Knop:**
  - **Heading Update:** Koptekst op `01/06` gewijzigd naar *"Maak een selfie Video en zet die in de Photo App"*.
  - **Directe Photo App Link:** Op de telefoon verschijnt in fase `01/06` een opvallende knop `Photo App [ Team X ]` die direct doorlinkt naar de PhotoCircle/Photo app van de sessie.

## Version 9.4.14 (2026-10-25)
- **Live Sync Fix for Test-Phones & Real-Time Player State:**
  - **Test-Phones Polling:** `TestPhonesPage` (`/test-phones`) pollt nu elke seconde `/api/session-state`. Hierdoor lopen de header-fase-badge (`Fase: 01/01`, `Fase: 10/05`) en teaminformatie realtime synchroon mee met de presentator/display.
  - **Player `joined_players` State Sync:** De polling loop op de telefoons (`/player`) update nu ook `joined_players` dynamisch. Zodra één telefoon (of speler) een naam claimt, verdwijnt die naam direct realtime op alle andere telefoons in de simulator.
  - **Reset All to '?'**: Reset knop stuurt actie direct door naar de actieve sessie zodat server state en schermen naadloos synchroon gereset worden.

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
