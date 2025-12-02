# MEVOTES System Reference

## ⚠️ IMPORTANT: Only work on MEVOTES system, DO NOT touch Ranking!

## The 3 Views

| View | Device | Purpose |
|------|--------|---------|
| **MEPRESENTER** | Laptop | Control panel - start voting, show results, next round |
| **MEPHONE** | Phones | Voting interface - tap on a character to vote |
| **MEDISPLAY** | TV/Beamer | Results display - shows voting results to audience |

## Full URLs

### Production (ranking.pinkmilk.eu) ✅ WORKING
- **MEPRESENTER**: `https://ranking.pinkmilk.eu/mevotes?view=mepresenter`
- **MEPHONE**: `https://ranking.pinkmilk.eu/mevotes?view=mephone&session=default_session`
- **MEDISPLAY**: `https://ranking.pinkmilk.eu/mevotes?view=medisplay`

### Localhost
- **MEPRESENTER**: `http://localhost:3000/mevotes?view=mepresenter`
- **MEPHONE**: `http://localhost:3000/mevotes?view=mephone&session=default_session`
- **MEDISPLAY**: `http://localhost:3000/mevotes?view=medisplay`

## Current Status

### What's Working ✅
- MEPRESENTER: Control panel with timer, start voting, show results, next round
- MEPHONE: Vote on 4 character images 
- MEDISPLAY: Shows voting results with animated percentages
- Timer dots animation
- PocketBase real-time sync between all views
- Character names extracted from image filenames

### Images
Images are loaded from: `https://www.pinkmilk.eu/ME/vote_images/`
- Filename format: `1_Character Name.webp`, `2_Another Name.webp`, etc.
- The number prefix (1_, 2_, etc.) determines the order
- The name after the prefix becomes the display title

## File Location
- **Source code**: `/src/app/mevotes/page.tsx` (all 3 views in one file!)
- MePresenterView() - line ~40
- MePhoneView() - line ~438
- MeDisplayView() - line ~635

### Old/Broken (DO NOT USE)
- `/public/votes/` - old standalone app, missing display view

## DO NOT TOUCH
- `/src/app/presenter/` - This is RANKING, not VOTES
- `/src/app/player/` - This is RANKING, not VOTES
- `/src/app/display/` - This is RANKING, not VOTES

## Communication Examples

✅ **Good:**
- "MEPRESENTER panel needs a new button"
- "MEPHONE screen should show bigger images"
- "MEDISPLAY should display the timer"

❌ **Confusing:**
- "The presenter" (which one? VOTES control or RANKING presenter?)
- "The display" (which one? VOTES screen or RANKING display?)
