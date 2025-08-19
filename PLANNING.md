# PLANNING.md - Ranking Gameshow Project

## Project Vision

Create an interactive ranking gameshow platform that supports live audience participation with real-time synchronization across multiple devices. The system enables presenters to run engaging ranking games where players submit responses via their phones, and results are displayed on a large screen with animated visualizations.

## Architecture Overview

### Three-Screen Architecture
1. **Presenter Interface (MacBook)**: Control panel for game management
   - Start/stop games
   - Control score reveals
   - Monitor player participation
   - Manage game flow

2. **Player Interface (Mobile Phones)**: Participant interaction
   - Join games via simple code
   - Submit rankings/responses
   - View personal scores
   - Real-time feedback

3. **Display Screen (TV/Beamer)**: Audience visualization
   - Live animated charts and results
   - Word clouds, donut charts, bar charts
   - Presenter-controlled reveal timing
   - Engaging visual effects

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Presenter     │    │   PocketBase    │    │   Display       │
│   (MacBook)     │◄──►│   Database      │◄──►│   (TV/Beamer)   │
└─────────────────┘    │   + Real-time   │    └─────────────────┘
                       │   Subscriptions │
┌─────────────────┐    │                 │
│   Players       │◄──►│                 │
│   (Phones)      │    └─────────────────┘
└─────────────────┘
```

## Technology Stack

### Frontend Framework
- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React 18+** with hooks and context

### Database & Real-time
- **PocketBase** for backend and real-time subscriptions
- **WebSocket connections** for live updates
- **SQLite** backend (via PocketBase)

### Visualization & Animation
- **Highcharts** for interactive charts
- **Framer Motion** for UI animations
- **Custom CSS animations** for transitions

### Deployment & Infrastructure
- **Vercel** for frontend hosting
- **Self-hosted PocketBase** for backend
- **Domain**: ranking.pinkmilk.eu
- **CDN**: Vercel Edge Network

### Development Tools
- **ESLint + Prettier** for code quality
- **Husky** for git hooks
- **TypeScript strict mode**
- **Tailwind IntelliSense**

## Core Features

### Game Management
- Create and configure ranking games
- Pre-loaded content with customization options
- Single session games (no pause/resume)
- Manual scoreboard control
- Real-time player monitoring

### Player Experience
- Simple join process (game code)
- Intuitive ranking interface
- Real-time feedback
- Mobile-optimized design
- Offline resilience

### Visualization Engine
- Animated chart reveals
- Multiple chart types (word clouds, donut, bar)
- Smooth 60fps animations
- Large display optimization
- Responsive design

### Real-time Synchronization
- Support for 100+ concurrent players
- Live data updates
- Network interruption handling
- State synchronization
- Performance optimization

## Development Phases

### Phase 1: Foundation (MVP)
- Basic three-screen setup
- Simple ranking game
- PocketBase integration
- Real-time synchronization
- Core presenter controls

### Phase 2: Enhanced Features
- Multiple game types
- Advanced visualizations
- Custom content management
- Improved animations
- Performance optimization

### Phase 3: Production Ready
- Comprehensive testing
- Error handling
- Deployment automation
- Documentation
- User onboarding

## Performance Requirements

### Response Times
- Game join: < 2 seconds
- Real-time updates: < 100ms
- Chart animations: 60fps
- Large display rendering: Smooth

### Scalability
- Support 100+ concurrent players
- Handle network interruptions gracefully
- Maintain stable memory usage
- Optimize for mobile networks

### Compatibility
- iOS Safari 14+
- Android Chrome 90+
- MacBook Safari/Chrome
- Large display browsers

## Security & Privacy

### Data Protection
- No personal data collection
- Session-based identification
- Secure WebSocket connections
- GDPR compliance

### Game Integrity
- Presenter authentication
- Player session validation
- Anti-spam measures
- Rate limiting

## File Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI elements
│   ├── game/           # Game-specific components
│   ├── charts/         # Chart components
│   └── layout/         # Layout components
├── pages/              # Next.js pages
│   ├── presenter/      # Presenter interface
│   ├── player/         # Player interface
│   └── display/        # Display screen
├── lib/                # Utilities and configurations
│   ├── pocketbase.ts   # Database client
│   ├── types.ts        # TypeScript definitions
│   └── utils.ts        # Helper functions
├── hooks/              # Custom React hooks
├── styles/             # Global styles
└── public/             # Static assets
```

## Key Design Principles

1. **Mobile-First**: Design for phones, scale up
2. **Real-time First**: Build with live updates from start
3. **Component-First**: Reusable, atomic components
4. **Presenter-Friendly**: Non-technical user focus
5. **Performance-Oriented**: 60fps animations priority

## Technical Decisions

### State Management
- React Context for global game state
- PocketBase real-time subscriptions
- Local state for UI interactions
- Optimistic updates for responsiveness

### Styling Approach
- Tailwind CSS utility-first
- Component-scoped styles
- Responsive design patterns
- Dark/light theme support

### Error Handling
- Graceful degradation
- Network interruption recovery
- User-friendly error messages
- Fallback UI states

---

## Status Update (2025-08-19)

- Display media pathing updated: ranking collection first, then local `/pics` fallback.
- Visual "Local file" badge added to Display when fallback is used.
- Cleaned repo (ignore FCP bundles) and pushed changes; Vercel auto-deploy monitors live at `https://ranking.pinkmilk.eu`.
- Next: verify Presenter/Display sync with filename-only headings and refine Presenter input UX for selecting `/pics` files.

*Last Updated: 2025-08-19*
*Next Review: After production verification of Display/Presenter media sync*
