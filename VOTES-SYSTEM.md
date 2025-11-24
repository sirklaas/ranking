# VOTES System Reference

## ⚠️ IMPORTANT: Only work on VOTES system, DO NOT touch Ranking!

## The Problem
The VOTES system has confusing URL parameter names that don't match their actual function.

## Current URLs (Confusing Names)

### What Works
- **Control Panel** (for presenter): `?view=presenter`
  - Has buttons: "1 ronde", "Start voting", "Results"
  - Controls the voting rounds
  - Uses dots timer (replaced blue line)
  
- **Voter Screen** (for audience phones): `?view=voter&session=SESSION_ID`
  - Shows 4 AI-generated character images
  - Allows voting by clicking on a character
  
- **Display Screen** (for TV/beamer): `?view=display&session=SESSION_ID`
  - Shows voting results to audience
  - Shows which character is winning

### The Confusion
The URL says `view=presenter` but it's actually the **control panel**.
The URL says `view=display` but it's actually the **results display**.

## Better Names (for our communication)

When talking to me, use these clear names:

| What We Call It | Current URL | Device | Purpose |
|-----------------|-------------|--------|---------|
| **CONTROL** | `?view=presenter` | Laptop | Control panel with buttons |
| **VOTER** | `?view=voter&session=X` | Phones | Voting interface |
| **SCREEN** | `?view=display&session=X` | TV | Results display |

## Full URLs

### Production (ranking.pinkmilk.eu)
- **CONTROL**: `https://ranking.pinkmilk.eu/votes?view=presenter`
- **VOTER**: `https://ranking.pinkmilk.eu/votes?view=voter&session=SESSION_ID`
- **SCREEN**: `https://ranking.pinkmilk.eu/votes?view=display&session=SESSION_ID`

### Localhost
- **CONTROL**: `http://localhost:3000/votes?view=presenter`
- **VOTER**: `http://localhost:3000/votes?view=voter&session=SESSION_ID`
- **SCREEN**: `http://localhost:3000/votes?view=display&session=SESSION_ID`

## Current Status

### What's Working
✅ CONTROL panel with buttons (1 ronde, start voting, results)
✅ VOTER screen with 4 character images
✅ SCREEN showing results
✅ Dots timer (replaced blue line)
✅ PocketBase integration

### What Needs Work
❓ Tell me what's broken or what you want to change

## File Location
- All VOTES code: `/public/votes/`
- Main HTML: `/public/votes/index.html`
- JavaScript: `/public/votes/assets/*.js` (compiled React app)

## DO NOT TOUCH
- `/src/app/presenter/` - This is RANKING, not VOTES
- `/src/app/player/` - This is RANKING, not VOTES
- `/src/app/display/` - This is RANKING, not VOTES

## Communication Examples

✅ **Good:**
- "The CONTROL panel needs a new button"
- "VOTER screen should show bigger images"
- "SCREEN should display the timer"

❌ **Confusing:**
- "The presenter" (which one? VOTES control or RANKING presenter?)
- "The display" (which one? VOTES screen or RANKING display?)
