# Endgame - Dual-Screen Presentation System

A premium dual-screen presentation system for the Ranking endgame experience, featuring interactive cards with video playback and real-time synchronization.

## Features

- 🎴 **8 Interactive Cards** - Beautiful grid layout with hover effects
- 🎬 **Video Playback** - Smooth video presentation with first-frame preview
- ⌨️ **Keyboard Navigation** - Simple arrow-key controls
- 🔄 **Real-Time Sync** - Presenter and display stay synchronized
- 🎨 **Premium Design** - Modern dark theme with glassmorphism effects
- 📱 **Responsive** - Works on various screen sizes

## Quick Start

1. **Open Presenter**:
   ```
   file:///Users/mac/GitHubLocal/RankingNW/endgame/index.html
   ```

2. **Open Display** (on second screen):
   ```
   file:///Users/mac/GitHubLocal/RankingNW/endgame/display.html
   ```

3. **Present**:
   - Click a card to select it
   - Press `→` to play video
   - Press `→` again to return to grid

## Files

- `index.html` - Presenter controller interface
- `display.html` - Display/beamer view
- `styles.css` - Shared premium styling
- `app.js` - State management and synchronization
- `*.png` - Card images (8 cards)
- `bedrieglijk.m4v` - Example video file

## Adding More Videos

To add video files for the other cards:

1. Place `.m4v` or `.mp4` files in the endgame directory
2. Update the video paths in `app.js` (lines 4-11)
3. Reload the pages

## Keyboard Controls

- `→` (Right Arrow) - Progress through states
- `R` - Reset all cards

## Browser Compatibility

- ✅ Chrome/Edge
- ✅ Safari
- ✅ Firefox

## Technical Details

- **Sync Method**: localStorage + storage events
- **No Backend Required**: Runs entirely in the browser
- **State Persistence**: Survives page refreshes

---

Built with ❤️ for the Ranking presentation system
