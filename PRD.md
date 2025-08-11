# PRD.md - Product Requirements Document

## Product Overview

**Product Name**: Ranking Gameshow Platform  
**Domain**: ranking.pinkmilk.eu  
**Target Users**: Event presenters 
**Core Value**: Enable interactive ranking games with real-time audience participation and display of ranking in the form of charts an


## User Stories

### Presenter (Primary User)
- **As a presenter**, I want to start a ranking game quickly so that I can engage my audience without technical complexity
- **As a presenter**, I want to control when scores are revealed so that I can build suspense and manage the game flow
- **As a presenter**, I want to see live participation metrics so that I can gauge audience engagement
- **As a presenter**, I want to use pre-loaded content so that I don't need to prepare questions in advance
- **As a presenter**, I want to customize content so that I can tailor games to my specific audience
- **As a presenter**, I want simple controls so that I can focus on hosting rather than managing technology

### Players (Secondary Users)
- **As a player**, I want to join games easily so that I can participate without downloading apps
- **As a player**, I want to submit rankings quickly so that I don't miss the time window
- **As a player**, I want to see my score so that I know how well I performed
- **As a player**, I want the interface to work on my phone so that I can participate from anywhere in the venue
- **As a player**, I want real-time feedback so that I know my submission was received

### Audience (Tertiary Users)
- **As an audience member**, I want to see engaging visualizations so that I stay interested in the results
- **As an audience member**, I want to understand the results quickly so that I can follow the game progression

## Functional Requirements

### Core Game Mechanics

#### FR-001: Game Creation and Management
- Presenter can create new ranking games

- Pre-loaded question sets available
- Custom question creation capability
- Game session management

#### FR-002: Player Participation
- Simple join process using game codes (4 digits)
- No registration or app download required
- Mobile-optimized interface for all screen sizes
- Support for 100+ concurrent players
- Real-time submission tracking

#### FR-003: Ranking Interface
- Drag-and-drop ranking for mobile devices
- Touch-optimized controls
- Clear visual feedback for selections
- Submission confirmation
- Time limit indicators

#### FR-004: Real-time Synchronization
- Live player count updates
- Real-time submission tracking
- Synchronized score reveals
- Network interruption handling
- Automatic reconnection

#### FR-005: Visualization Engine
- Animated chart reveals (word clouds, donut charts, bar charts)
- Presenter-controlled timing
- Smooth 60fps animations
- Large display optimization
- Multiple visualization types per game

### Technical Requirements

#### TR-001: Performance
- Game join response time < 2 seconds
- Real-time updates < 100ms latency
- Support 100+ concurrent connections
- 60fps animation performance
- Stable memory usage over extended sessions

#### TR-002: Compatibility
- iOS Safari 14+ support
- Android Chrome 90+ support
- MacBook Safari/Chrome support
- Large display browser compatibility
- Responsive design across all screen sizes

#### TR-003: Reliability
- 99.9% uptime during game sessions
- Graceful degradation for poor connections
- Automatic error recovery
- Data persistence during network issues
- Fallback UI states

## Non-Functional Requirements

### Usability
- Presenter setup time < 30 seconds
- Player join time < 10 seconds
- Intuitive interface requiring no training
- Clear visual hierarchy and feedback
- Accessibility compliance (WCAG 2.1 AA)

### Performance
- Page load time < 2 seconds on good WiFi
- Real-time updates with minimal lag
- Smooth animations on all target devices
- Efficient bandwidth usage for mobile users
- Optimized for large display rendering

### Security
- No personal data collection
- Session-based player identification
- Secure WebSocket connections
- Rate limiting for spam prevention
- GDPR compliance

### Scalability
- Horizontal scaling capability
- Database [pocketbase] optimization for concurrent access
- Load balancing for high traffic

## User Interface Requirements

### Presenter Interface (MacBook)
- Clean, professional dashboard
- Large, touch-friendly controls
- Real-time participation metrics
- Game flow management tools
- Content library access
- Score reveal controls

### Player Interface (Mobile)
- Mobile-first responsive design
- Touch-optimized interactions
- Clear visual feedback
- Minimal cognitive load
- Fast loading times
- Offline resilience

### Display Interface (TV/Beamer)
- Large text and graphics
- High contrast for visibility
- Engaging animations
- Professional appearance
- Customizable branding
- Full-screen optimization

## Game Types and Content

### Ranking Games
- 1 Intro
- 4 Guilty pleasures
- 7 zitten en staan

- 10 Top 3
- 13 Krakende Karakters 
- 17 Top 10 
- 20 Finale 

### Customization Options
- Questions dashboard / Upload custom images
- Create custom categories
- Set time limits
- Configure scoring systems
- Brand customization

### Technical Metrics
- Page load time < 2 seconds
- Real-time update latency < 100ms
- System uptime > 99.9%
- Error rate < 0.1%

## Constraints and Assumptions

### Technical Constraints
- Single game session (no pause/resume)
- WebSocket dependency for real-time features
- Mobile browser limitations
- Network bandwidth variations

### Business Constraints
- Self-hosted PocketBase requirement
- Vercel deployment limitations
- Domain-specific branding
- No monetization features in MVP

### User Assumptions
- Presenters have basic computer literacy
- Players have smartphones with modern browsers
- Venue has reliable WiFi for all participants
- Large display screen available for visualization

### Design 
- use ranking_logo2.webp
- Use barlow semicondensed as typeface always !!!!




## Session Summary

**Last Updated**: 2025-08-11  
**Version**: 1.6  
**Status**: Presenter layout full-width with precise proportions; Player onboarding stable  
**Next Steps**: Test complete flow and implement real-time synchronization

### Recent Updates (2025-08-11)
- ✅ Image delivery: configured `next.config.ts` to allow `next/image` from `pinkmilk.pockethost.io` (PocketBase).
- ✅ Motherfile media upload hardening in Presenter (`src/app/presenter/page.tsx`):
  - Robust JSON parsing/guard for `POST /api/pb-motherfile` responses.
  - After successful upload, immediate `GET /api/pb-motherfile` to retrieve and cache `meta.recordId` via `motherfileService.setRecordId()`.
  - Also caches `recordId` during media list refreshes.
  - Headings store only the filename; render logic builds URLs via `motherfileService.fileUrl(fileName)`.
  - Inline success/failure banner remains; previews refresh automatically.
- ✅ Presenter JSON Dashboard: per-fase Upload button next to each `Picture` field.
  - Uploads directly to PocketBase Motherfile via secure server route `api/pb-motherfile`.
  - Auto-fills the uploaded filename into the fase’s `image` value.
  - Shows success/failure banner; refreshes the global media list (previews).
- ✅ PocketBase as single source of truth confirmed: Presenter, Player, and Display read/write directly to Motherfile singleton. No local `/assets/fases.json`.
- ✅ Production safety: PocketBase base URL defaults to HTTPS `https://pinkmilk.pockethost.io` to prevent mixed content on `ranking.pinkmilk.eu`.
- ✅ Presenter Save Global verifies PB update and shows inline feedback.
- ℹ️ Make sure Vercel envs are set: `NEXT_PUBLIC_POCKETBASE_URL`, and PB admin creds/token for server routes.

### Recent Updates (2025-08-08)
- ✅ Presenter now truly uses 100% screen width on MacBook Pro displays
- ✅ Applied layout proportions and spacing:
  - 2% left/right outer margins
  - 2% gaps between main columns and screens
  - 6% width for fases column (right)
  - 44% width for Current and Next displays (left), side-by-side
  - Left/main section set to 90% to accommodate 44/2/44 split
- ✅ Ensured Barlow Semi Condensed 300 for “Current” and “Next” labels
- ℹ️ File updated: `src/app/presenter/page.tsx` (`renderGameInterface()` and outer container)
 - ✅ Visual polish: added 3px dark grey borders to screens and previews
 - ✅ Visual polish: added heading bars above Current and Next media previews
 - ✅ Visual polish: label styling finalized (uppercase, tracking-wide, Barlow 300)

### Recent Updates (2025-08-07)
- ✅ **Enhanced Presenter Screen**: Added game control interface with current/next display preview
- ✅ **"Start Ranking Game" Button**: Transitions presenter to live game control mode
- ✅ **Game Control Interface**: Shows game title, current time, game timer, and phase navigation
- ✅ **Phase Navigation**: 7 numbered buttons (1-7) for jumping between game phases
- ✅ **Display Preview**: Current and next display screens visible to presenter
- ✅ **Player Onboarding Flow**: Complete 3-phase onboarding sequence implemented
  - Phase 1: Team selection with typewriter animation "In welk team zit je?"
  - Phase 2: PhotoCircle account check "Heb je 'n PhotoCircle account?" (Ja/Nee buttons)
  - Phase 3: Name selection "Wat is jouw naam?" (clickable name buttons)
- ✅ **Player Data Persistence**: Player name and team stored in localStorage for later use
- ✅ **State Management**: Complete flow state tracking from team selection to completion
- ✅ **Popup Animations**: PhotoCircle app download popup with grow/fade animations
- ✅ **Typewriter Animations**: One-time typewriter effect for question display

### Previous Updates (2025-08-04)
- ✅ Updated presenter page UI with proper Barlow Semi Condensed fonts
- ✅ Reduced info block heights by 50% for better visual hierarchy
- ✅ Removed player names block for cleaner interface
- ✅ Reordered layout: Session controls above JSON dashboard
- ✅ Integrated comprehensive CSV data (44 game phases/questions)
- ✅ Added "Load New Structure to PB" button for PocketBase JSON updates
- ✅ All game phases now available: Intro, Guilty Pleasures, Zitten en Staan, De Top 3, Krakende Karakters, Top 10, De Finale
- ✅ Deployed to https://ranking.pinkmilk.eu/presenter

### Current JSON Structure
The dashboard now supports the complete game flow with 44 different phases and questions, properly structured for PocketBase integration.

---

*This document serves as the single source of truth for product requirements. All development decisions should align with these specifications.* 
