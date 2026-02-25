# Krakende Karakters — Planning Document

## Module Overview

**Fase group**: `13` — fases `13/01` through `13/06`  
**Module key**: `13/02` (registered from fase 13/02 onwards)  
**stateField**: `krakende_state`  
**skipTrailer**: `false`

---

## Fase Map

| Fase  | Meaning                     | Internal phase      |
|-------|-----------------------------|---------------------|
| 13/01 | Trailer (normal media overlay) | — (module skipped) |
| 13/02 | Intro / module activates    | `positive-voting`   |
| 13/03 | Positief stemmen            | `positive-voting`   |
| 13/04 | Negatief stemmen            | `negative-voting`   |
| 13/05 | Positief resultaten         | `positive-results`  |
| 13/06 | Negatief resultaten         | `negative-results`  |

`getPhaseFromFaseKey()` maps global faseKey → internal phase. `PresenterView` calls `setPhase()` when `faseKey` changes.

---

## State Shape (`KrakendeState`)

```ts
{
  phase: 'positive-voting' | 'negative-voting' | 'positive-results' | 'negative-results';
  language: 'nl' | 'en';
  positiveTraits: KrakendeTrait[];   // 24 default positive traits
  negativeTraits: KrakendeTrait[];   // 24 default negative traits
  submissions: KrakendeSubmission[]; // one entry per player (can have both pos + neg)
  revealedIndex: number;             // unused in current display (auto-reveal handles it)
  completedPhases: KrakendePhase[];
}
```

---

## State Persistence — Critical Architecture Issue

**`krakende_state` is stored INSIDE `headings` JSON, not as a top-level PB field.**

`updateState()` in `logic.ts`:
- Reads: `session.headings → hObj.krakende_state`
- Writes: `{ headings: JSON.stringify({ ...hObj, krakende_state: newState }) }`

**BUT** `moduleStates` on display/player/presenter are populated by reading `session.krakende_state` (top-level field).  
The `RankingSession` type has `krakende_state?: string` as a top-level field.

This is a **split-brain**: logic writes to `headings.krakende_state`, but all view pages read from `session.krakende_state` (top-level).

### Consequence
- Display/phone never see state updates from voting (submissions counter stays 0 on display).
- `moduleStates['krakende_state']` is only populated if the top-level `krakende_state` field is set.
- Phase changes via presenter (setPhase) save into headings, not top-level → display never re-renders.

---

## Data Flow per Screen

### Presenter (`PresenterView.tsx` → `KrakendePresenter.tsx`)
- Reads `moduleStateJson` (from `moduleStates['krakende_state']` in presenter page).
- On faseKey change: calls `setPhase()` → writes to `headings.krakende_state` in PB.
- Buttons 1-4 call `setPhase()` directly.
- Keyboard 1-4 call `setPhase()` directly.
- `RESET GAME` calls `resetState()`.

### Display (`DisplayView.tsx` → `KrakendeDisplay.tsx`)
- Returns `null` for `faseKey === '13/01'` (trailer fase).
- Shows voting grid (traits pop in one by one, 700ms interval, auto-reveal).
- Shows results grid (all traits visible, fade-in animation) when `isResults`.
- Heading text is hardcoded in component (`'Goede Geinige Eigenschappen'` etc), not from headings JSON.
- Uses `styled-jsx` (`<style jsx>`) for keyframe animations — **broken in Next.js App Router** (no styled-jsx support).

### Phone (`PlayerView.tsx` → `KrakendePlayer.tsx`)
- Returns `null` for `faseKey === '13/01'` or no `moduleStateJson`.
- Voting: 2-col grid of trait buttons, confirm button fixed at bottom.
- After vote: "Keuze Opgeslagen!" screen.
- Results phase: "BEKIJK POSITIEF/NEGATIEF" button (6s delay), then fullscreen trait reveal rotated 90°.
- Persists choice in `localStorage` as fallback.

### API (`/api/krakende-choice`)
- Receives `POST { sessionId, playerId, playerName, teamNumber, traitId }`.
- Calls `updateState()` with OCC (10 retries) → saves to `headings.krakende_state`.
- Returns `{ success, state }`.

---

## Known Problems

### 1. State stored in wrong PB field
`logic.updateState()` saves state inside `headings` JSON object (`headings.krakende_state`).  
All page-level code (`moduleStates` syncing) reads `session.krakende_state` (top-level field).  
**Effect**: Phase changes and vote submissions are invisible to display/phone via PB subscription.

### 2. `styled-jsx` in App Router
`KrakendeDisplay.tsx` uses `<style jsx>{...}</style>` for `krakendePop` and `fadeIn` keyframes.  
Next.js App Router does NOT support styled-jsx — animations silently fail.

### 3. Heading overlay is a huge ghost text
In `KrakendeDisplay.tsx` the heading `<h1>` has `fontSize: '500pt'` with `position: absolute`, centered.  
This renders a giant partially visible text behind everything — likely unintended.

### 4. `PresenterView` hooks order violation
`PresenterView.tsx` calls `useEffect` after `if (!sessionId) return null` — React hooks rule violation.  
(Same pattern as was fixed in `Top3/PresenterView.tsx`.)

### 5. `revealedIndex` is set but never used on display
`revealNextTrait()` increments `revealedIndex` in state, but `KrakendeDisplay` uses its own local `autoRevealIndex` state.  
Manual reveal from presenter is completely disconnected from what display shows.

### 6. Module not auto-initialized
Unlike Top3 (which was fixed to persist initial state), Krakende's `PresenterView` doesn't auto-persist initial state.  
Phone/display get no `krakende_state` until the presenter navigates to 13/02+ AND the state write lands in the right field.

---

## Files

| File | Role |
|------|------|
| `src/modules/fases/Krakende Karakters/config.ts` | Key `13/02`, group `13`, stateField `krakende_state` |
| `src/modules/fases/Krakende Karakters/index.ts` | Registers module with Presenter/Display/PlayerView |
| `src/modules/fases/Krakende Karakters/PresenterView.tsx` | Wrapper, syncs faseKey → phase, hooks order bug |
| `src/modules/fases/Krakende Karakters/DisplayView.tsx` | Wrapper, skips 13/01 |
| `src/modules/fases/Krakende Karakters/PlayerView.tsx` | Wrapper, skips 13/01 |
| `src/modules/krakende-karakters/types.ts` | State, phase, trait, submission types |
| `src/modules/krakende-karakters/logic.ts` | All state mutations; **stores in headings, not top-level** |
| `src/modules/krakende-karakters/defaults.ts` | 24 positive + 24 negative default traits |
| `src/components/krakende-karakters/KrakendePresenter.tsx` | Presenter UI: phase buttons, submissions overview |
| `src/components/krakende-karakters/KrakendeDisplay.tsx` | Display: auto-reveal voting grid + results grid; styled-jsx bug; heading font-size bug |
| `src/components/krakende-karakters/KrakendePlayer.tsx` | Phone: trait selection, confirm, reveal button |
| `src/app/api/krakende-choice/route.ts` | Vote submission API; uses OCC updateState |

---

## Required Fixes (Priority Order)

### P0 — State field mismatch (breaks everything)
`logic.ts` must write to `session.krakende_state` (top-level) instead of `headings.krakende_state`.  
`updateState()` should call `rankingService.updateSession(sessionId, { krakende_state: JSON.stringify(newState) })`.

### P1 — Auto-initialize state on presenter load
`PresenterView` should persist initial state to PB when `moduleStateJson` is absent (same fix as Top3).  
Fixes phone/display showing nothing when navigating to fase 13/02 cold.

### P2 — Fix hooks order in PresenterView
Move `useEffect` before `if (!sessionId) return null`.

### P3 — Fix styled-jsx animations in KrakendeDisplay
Replace `<style jsx>` with `useEffect`-injected `<style>` tag in document head.

### P4 — Fix heading overlay font size
`fontSize: '500pt'` is unintentional — likely should be `5rem` or `clamp(...)`.

### P5 — Connect revealedIndex to display
Currently presenter's reveal button does nothing visible.  
Either: use `autoRevealIndex` locally (current behavior, ignore revealedIndex), or drive display from `state.revealedIndex`.  
Decision needed.
