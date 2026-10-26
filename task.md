# Creepy Ranking Show — Task Checklist

## Phase 1: Branch Setup & Handoff Baseline
- [x] 1.1 Create and checkout Git branch `creepy-ranking`
- [x] 1.2 Verify clean baseline build (`npm run build`)
- [x] 1.3 Audit all incoming assets in `public/pics/` and `public/endgame/`

---

## Phase 2: Questions & Content (Fases)
- [x] 2.1 Wire up all 10 Halloween Monster cards for De Top 3 (10/05 - 10/13)
- [x] 2.2 Wire up all 10 Halloween cards for De Top 10 (17/05 - 17/14)
- [x] 2.3 Update `public/assets/fases.json` with Halloween media assignments and headings

---

## Phase 3: Media Asset Mapping & Trailers
- [x] 3.1 Optimize base trailer `trailercreepy.m4v` (compressed to 3.8MB with web fast-start)
- [x] 3.2 Update media resolver in `src/lib/pocketbase.ts` to map all trailers to `trailercreepy.m4v`
- [x] 3.3 Create dynamic animated heading overlay `SpookyTrailerTitle.tsx` with 1.4s pause and fiery Halloween typography
- [x] 3.4 Map Top 3, Top 10, and Finale Halloween media folders in `src/lib/pocketbase.ts`

---

## Phase 4: Krakende Karakters Creepy Traits
- [x] 4.1 Update traits in `src/modules/krakende-karakters/defaults.ts` with Creepy PDF values:
  - [x] 24 Griezelig Goede Eigenschappen (Spookachtig sprankelend, Vampierachtig vindingrijk, etc.)
  - [x] 24 Minder Goede Eigenschappen (Mummieficerend muggenzifterig, Duivels dramatisch, etc.)
- [ ] 4.2 Verify player vote buttons and presenter reveal boards render the new spooky traits correctly

---

## Phase 5: Spooky UI Theme & Polish
- [x] 5.1 Add Halloween color tokens / theme styles (Deep purple/black/orange gradients)
- [x] 5.2 Add Creepy Ranking Show logo badge with BrewHouse-Aged font and 🎃 icons
- [x] 5.3 Re-skin Display Intro team circles and player badges in pumpkin orange and dark slate
- [x] 5.4 Test sound effects & endcard audio (`public/endgame/endcard_audio.mp3`)
- [x] 5.5 Integrate Coded Endgame Engine with pure Voronoi glass shatter, SVG ticket reveal, star particles, and 8 Munten outcomes
- [x] 5.6 Map all 8 Halloween cards (Betoverd, Vrolijk, Ondeugend, Mystiek, Gentle, Elegant, Wijs, Muzikaal) into Finale DisplayView and PresenterView
- [x] 5.7 Add live interactive testing suite for trailers, 48 traits, and 8 coded cards at `/creepy-preview`

---

## Phase 6: End-to-End Dry Run (Wednesday Readiness)
- [x] 6.1 Set up Halloween Presenter, Display & Player test environment
- [x] 6.2 Add 6 Test Phones screen styled with Creepy Halloween look (`/test-phones`)
- [ ] 6.3 Run full round test (simulate 6 players voting through all phases)
- [ ] 6.4 Deploy `creepy-ranking` branch to Vercel preview domain

---

## Phase 7: Post-Wednesday Multi-Show Integration (Stage 2)
- [ ] 7.1 Merge `creepy-ranking` changes cleanly into `main` behind a theme toggle
- [ ] 7.2 Add edition selector (`Ranking | Creepy Ranking | Christmas Ranking`) on `pnkmilk.db` dashboard
- [ ] 7.3 Store `theme` / `edition` on PocketBase session records for automatic theme loading
