# Verschillen Ranking Standaard (`main`) vs. Halloween Editie (`halloween`)

Dit document beschrijft alle verschillen tussen de standaard Ranking versie (`origin/main`) en de Halloween editie (`halloween`, versie `v9.4.37`).

---

## 1. Verschillen in Code (Wat er gewijzigd is)

### A. Concurrency Veiligheid & Stem-API’s (`src/app/api/`)
* **`top3-vote/route.ts` & `top10-vote/route.ts` (Oplossing A: Post-Write Verification met Retry)**
  * **Standaard:** Deed een simpele `read → append → write` zonder concurrency controle. Bij gelijktijdige stemmen konden telefoons elkaars stemmen overschrijven.
  * **Halloween:** Bevat een verificatiestap direct na het wegschrijven: het controleert of het verwachte aantal stemmen klopt én of de stem van de specifieke speler daadwerkelijk aanwezig is in PocketBase. Zo niet, gooit de server een foutmelding en volgt direct een retry met jittered backoff.
* **`zitten-vote/route.ts` (Nieuw bestand)**
  * **Standaard:** Bestond niet (zitten/staan gebruikte uitsluitend lokale frontend component-state).
  * **Halloween:** Een dedicated server-side route om stemmen per vraag direct op te slaan en op te vragen, inclusief automatische opschoning per slide.
* **`session-state/route.ts`**
  * **Halloween:**
    * Bij een globale reset worden nu ook alle `zitten_votes` records gewist.
    * Zodra de Presenter doorschakelt naar een nieuwe Zitten & Staan slide (`07/*`), wist de API automatisch de oude stemmen van die slide zodat de tellers direct op `0` beginnen.
    * Ondersteunt `id === 'latest'` voor betrouwbare fallback-koppeling.

---

### B. Bestandsroutering & Asset Mapping (`src/lib/pocketbase.ts`)
* **Halloween Asset Resolutie:**
  * Automatische mappendetectie voor `/pics/Top3 Haloween/`, `/pics/Top10Haloween/` en `/pics/End Haloween/`.
  * **Trailer redirects:** Waar de standaardversie aparte trailers aanriep (`TrailerZitten.mp4`, `TrailerTop3.mp4`, `Top10.mp4`, `end.m4v`), leidt de Halloween code alle trailer-aanvragen direct om naar `trailercreepy.m4v`.
  * **Alias Mapping:** Automatische vertaling van oude bestandsnamen naar de nieuwe Halloween assets (bv. `verliefd.webp` $\rightarrow$ `dracula.webp`, `pukkel.webp` $\rightarrow$ `hannibal.webp`, etc.).

---

### C. Display Scherm (`src/app/display/page.tsx` & Display Components)
* **Audio-beleid (100% Mute):**
  * **Standaard:** Het grote beamer-scherm speelde trailers en video’s mét geluid af.
  * **Halloween:** Video’s op het Display zijn permanent `muted = true` en `volume = 0`. Al het geluid (video’s, soundboard, effecten) wordt via de Presenter MacBook naar de zaalversterker gestuurd.
* **Spooky Trailer Titles:**
  * Nieuw component `SpookyTrailerTitle.tsx` rendert dynamisch een spookachtige titel over de neutrale `trailercreepy.m4v` video.
* **Real-time Zitten & Staan Tellers:**
  * `ZittenDisplayCounters` toegevoegd onderin het scherm: twee afgeronde blokken (rood links, blauw rechts) die live meelopen met de stemmen uit `/api/zitten-vote` en bij elke slide automatisch op 0 springen.
* **Top 3 & Top 10 Display:**
  * Vaste layout met de nieuwe Halloween illustraties.
  * Namenmuur met stemmende spelers is compacter gemaakt en onderin geplaatst met een donkere achtergrondwaas, zodat vraag en afbeelding gecentreerd blijven.

---

### D. Presenter Dashboard (`src/app/presenter/page.tsx`)
* **MacBook Viewport / Geen Scroll:**
  * Layout omgebouwd met strakke constraints (`overflow-hidden`, compactere header en knoppen). Alles past gegarandeerd op het 13"/14"/16" MacBook scherm zonder verticaal te scrollen.
* **MacBook Audio Toggle:**
  * Bovenin de Presenter videopreview zit een knop `[🔊 MacBook Audio: AAN/UIT]`, waarmee de presentator direct ziet en instelt of het geluid naar de versterker open staat.
* **Eindkaart / Lawineboys Hotkey:**
  * Sneltoets `'e'` toegevoegd om direct de End Card met de Review QR-code en afsluitende muziek te activeren.
* **Sub-state Initialisatie:**
  * Bij het aanklikken van een Top 3 of Top 10 vraag initialiseert de Presenter direct een schone stemronde in PocketBase om synchronisatieproblemen tussen Display en Mobiel te voorkomen.

---

### E. De Finale (`src/modules/fases/De Finale/20-01/`)
* **`CodedEndgameReveal.tsx` (Nieuw component):**
  * Custom HTML5 Canvas Voronoi glasbreuk-engine. Bij het onthullen barst de dichte kaart in honderden glasscherven uiteen met gesynchroniseerde geluidseffecten (`glass_shatter.mp3`, `star_buildup.mp3`).
* **Telefoonscherm van Spelers (`PlayerView.tsx`):**
  * **Standaard:** Toonde statusbalken, knoppen en banners.
  * **Halloween:** Toont uitsluitend de strak gecentreerde illustratie van de kaart met een rustige fade-in animatie (`animate-card-fade-in`), zonder afleidende knoppen of teksten.
* **Presenter Finale Grid (`PresenterView.tsx`):**
  * Een compact 4x2 raster met alle 8 Halloween kaarten dat direct de status (`used`, `selected`, `revealed`) bijhoudt.

---

### F. Krakende Karakters & Mobiele UI (`KrakendePlayer.tsx` & `globals.css`)
* **Krakende Karakters Bevestiging:**
  * **Standaard:** Bevestigingsknop zat onderin vastgepind.
  * **Halloween:** Zodra een speler een eigenschap aanklikt, schuift er een pop-up kaart naar het midden van het scherm met een duidelijke oranje knop (*"Ben je echt: [Eigenschap]?"*). Dit voorkomt misklikken.
* **Thema & Styling (`globals.css`):**
  * Toevoeging van spookachtige Google Fonts (`Creepster`, `Nosifer`, `Butcherman`, `Eater`) en lokale lettertypes (`BrewHouse`).
  * CSS animaties voor zachte kaart-fades (`@keyframes cardFadeIn`) ter vervanging van botsende transform-animaties.

---

## 2. Ronde-voor-ronde Inhoudelijke Verschillen

| Ronde | Standaard Editie (`main`) | Halloween Editie (`halloween`) |
| :--- | :--- | :--- |
| **01: Intro & Onboarding** | Neutrale kleurstelling, standaard Ranking logo en pastel accenten. | Spooky donker thema (`#07060a`), neon-oranje accenten, `CreepyRankingLogo`. Zelfde onboarding flow. |
| **07: Zitten en Staan** | Trailer: `TrailerZitten.mp4`. Standaard vraagcards. | Trailer: `trailercreepy.m4v` met spookachtige titel *"ZITTEN EN STAAN"*. Vraagteksten zijn identiek (10 stellingen), tellers resetten automatisch per slide naar 0, Display audio gemute. |
| **10: De Top 3** | Trailer: `TrailerTop3.mp4`. **Geen afbeeldingen** (`image: ""`) — alleen tekst gecentreerd met woordwolk. | Trailer: `trailercreepy.m4v` met titel *"DE TOP 3"*. **Elke vraag heeft een unieke Halloween horror-illustratie**. Vraagteksten zijn inhoudelijk identiek. |
| **13: Krakende Karakters** | Trailer: `KrakendeKarakters.mp4`. Neutrale vormgeving. | Zelfde karaktereigenschappen, vormgegeven in het donkere Halloween thema met pop-up bevestiging op mobiel. |
| **17: De Top 10** | Trailer: `Top10.mp4`. **Geen afbeeldingen** (`image: ""`). Bevat vragen over o.a. *"grootste zuiplap"* en *"wie laat weleens een wind"*. | Trailer: `trailercreepy.m4v` met titel *"DE TOP 10"*. **Elke vraag heeft een unieke Halloween illustratie**. Twee vragen zijn pikanter aangepast: *"Wie kan 40 dagen zonder sex?"* en *"Wie is de ideale schoonzoon of -dochter?"*. |
| **20: De Finale** | Trailer: `trailerfinale.mp4`. 8 gouden/paarse standaard kaarten (`creatief`, `doorzetter`, `wreed`, etc.). | Trailer: `trailercreepy.m4v` met titel *"FNUIKENDE FINALE"*. 8 unieke Halloween horror-kaarten. Voronoi glasbreuk-reveal flow en mobiele telefoons tonen puur de kaartafbeelding. |

---

## 3. De Top 3 — Vragen & Afbeeldingen

| Nr | Slide | Vraag | Afbeelding | Visuele omschrijving |
| :---: | :---: | :--- | :--- | :--- |
| **1** | `10/05` | *Wie wordt er echt heel erg snel verliefd* | `dracula.webp` | Een breed lachende Graaf Dracula in een gotisch kasteel met rode/zwarte cape. Hij proost met een glas rood bloed/wijn en houdt een met kaarsvet bedruipte wijnfles vast, omringd door fladderende vleermuizen en kandelaars. |
| **2** | `10/06` | *Wie is de ideale schoon- zoon of zus?* | `frankenstein.webp` | Het monster van Frankenstein met grove hechtingen, gekleed in een net colbert. Hij leunt over de houten toog van een rokerige bar met een glas whisky, terwijl er elektrische vonken en bliksemschichten uit zijn vingers knetteren. |
| **3** | `10/07` | *Je vliegtuig stort neer in de Andes. Wie eet je als eerste op ?* | `zombie.webp` | Een angstaanjagende vrouwelijke zombie met wijd opengesperde mond die schreeuwt naar het kille licht van een bungelende gloeilamp in een vervallen kelder, met bebloede handen en slierten haar. |
| **4** | `10/08` | *Wie zou je absoluut niet op je kinderen laten passen?* | `witch.webp` | Een sinistere heks met kromme puntmuts en gerafelde gewaden in een duister, mistig bos bij volle maan. Ze roept met klauwachtige handen giftig groene dampen op uit een borrelende heksenketel. |
| **5** | `10/09` | *Wie heeft de meeste crypto's* | `mummy.webp` | Een gespierde Egyptische mummie gewikkeld in verweerde linnen windsels, die dynamisch door een eeuwenoude tempel snelt terwijl goudkleurig zand opwaait tegen een achtergrond van oplichtende hiërogliefen. |
| **6** | `10/10` | *Wie komt het vaakst te laat?* | `skeleton.webp` | Een vrolijk grijnzend skelet in een bordeauxrood fluwelen standup comedy colbert met vlinderdas, die grappen staat te tappen in een retro chromen microfoon op een podium voor een oplichtend "Comedy Night" uithangbord. |
| **7** | `10/11` | *Wie zou er als eerste een account aanmaken op OnlyFans?* | `werewolf.webp` | Een woest grommende weerwolf van dichtbij met ontblote vlijmscherpe hoektanden en gloeiende gele ogen, badend in de warme oranje gloed van een gigantische volle bloedmaan. |
| **8** | `10/12` | *Wie moet je zeker geen geheim vertellen?* | `ghost.webp` | Een spookachtige vrouw in een fladderende, gescheurde witte Victoriaanse bruidsjurk die schreeuwend met gloeiend cyaanblauwe ogen door een ingeslagen ruit van een verlaten landhuis zweeft, omringd door rondvliegend glas en paarse bliksem. |
| **9** | `10/13` | *Wie zou je meenemen naar een parenclub?* | `sinister-man.webp` | Een charmante maar duistere aristocraat met strak achterovergekamd haar in een weelderig operatheater onder een enorme kristallen kroonluchter. Hij draagt een maatpak-smoking met zwarte lederen handschoenen en een rode roos, en kijkt met een veelbetekenende glimlach in de camera. |

---

## 4. De Top 10 — Vragen & Afbeeldingen

| Nr | Slide | Vraag | Afbeelding | Visuele omschrijving |
| :---: | :---: | :--- | :--- | :--- |
| **1** | `17/05` | *Een pijnlijke pukkel op je bil waar je niet bij kan. Wie mag hem voor je uitknijpen?* | `hannibal.webp` | Hannibal Lecter in een wit dwangbuis-achtig gewaad met zijn iconische lederen/metalen traliemasker om de mond. Hij staart ijskoud voor zich uit in een stenen kerker met op de achtergrond een glas wijn op tafel. |
| **2** | `17/06` | *Wie denkt dat ie altijd gelijk heeft?* | `always-right.webp` | Een maniakale 18e-eeuwse rechter met een metershoge gepoederde pruik en een goudgeborduurd rood fluwelen gewaad achter een stenen schedel-balie. Hij zwaait wild met een brandende hamer en wijst beschuldigend naar voren richting een publiek van skeletten. |
| **3** | `17/07` | *Wie zou meedoen [tegen betaling uiteraard] aan de naakte fotoshoot van het Perfecte Plaatje?* | `photoshoot.webp` | Een komische vintage fotoshoot: een poedelnaakt skelet ligt theatraal te poseren op een rode fluwelen chaise longue (met enkel een zwarte boa, hoge hakken en mascara), terwijl een skelet-fotograaf met baret foto's schiet met een antieke balgcamera tussen pompoenen en vleermuizen. |
| **4** | `17/08` | *Wie kan 40 dagen zonder sex?*<br>*(Standaard: "Wie is de grootste zuiplap?")* | `40-days.webp` | Een zwaar gefrustreerde, dampende weerwolf in houthakkersoverhemd en gescheurde jeans, vastgeketend achter tralies in een kerker. De stoom blaast uit zijn oren, de dagen staan in de muur gekerfd, en op de vloer ligt een eenzame rode roos en een open doosje bonbons. |
| **5** | `17/09` | *Wie kan absoluut niet tegen kritiek?* | `trump-pumpkin.webp` | Een karikatuur van Donald Trump in het Oval Office: getransformeerd tot een felle oranje pompoen met zijn typische blonde kuif, boze expressie en gebarende hand, terwijl Jack-o'-lanterns op de vensterbank gloeien. |
| **6** | `17/10` | *Wie is de ideale schoonzoon of -dochter?*<br>*(Standaard: "Wie laat weleens een wind?")* | `inlaw.webp` | Een retro Stepford-achtige schoondochter op een bloemetjesbank met een overdreven brede, maniakale glimlach en angstaanjagend rode vampierogen. Ze nipt keurig van een porseleinen theekopje, terwijl er subtiel bloed langs haar vinger druipt. |
| **7** | `17/11` | *Wie maakt de allerlelijkste Selfies ?* | `selfie-monster.webp` | Een ontbindende zombie-influencer met doorgelopen make-up, rottende wonden en weggedraaide witte ogen, die een 'peace sign' maakt en schattig probeert te poseren voor een smartphone op een ringlight-statief. |
| **8** | `17/12` | *Wie is het meest verslaafd aan Social Media?* | `socials-zombie.webp` | Een uitgemergelde cyber-zombie in een racestoel achter een bureau: zijn ontblote borstkas en armen zitten vol vergroeide smartphones en kabels, terwijl hij wordt bedolven onder een zwerm van honderden zwevende neon hartjes-, like- en notificatie-icoontjes. |
| **9** | `17/13` | *Wie krijgt de meeste bekeuringen?* | `speeding-ticket.webp` | Een 'Ghost Rider'-achtige politieagent met een vlammende schedel op een brandende motor, die in het donker een doodsbange automobilist aanhoudt onder een lichtbord met de tekst *"NEXT EXIT: HELL"*. |
| **10** | `17/14` | *Jullie doen mee met Temptation Island. Wie heeft als eerste iemand tusen de lakens?* | `temptation.webp` | Een verleidelijke duivelin met hoorntjes in een rode zijden jurk naast een gespierde vampier in open zwart hemd op een vulkanisch zwart zandstrand. Ze drinken cocktails uit gouden schedels onder een vuurrode bloedmaan en een rokende vulkaan met een neon *"TEMPTATION ISLAND"* bord. |
