# DECISIONS.md - Architectural Decision Log

This document records key architectural and design decisions for the CEAP Dashboard.
Each decision includes context, options considered, rationale, and consequences.

---

## ADR-001: Static JSON Data Architecture

**Date:** 2026-01-05
**Status:** Accepted
**Context:** Need to serve analytics data for 630k+ transactions to a public dashboard.

### Options Considered
1. **Traditional API server** (Node.js, Python FastAPI)
2. **Serverless functions** (Cloudflare Workers, AWS Lambda)
3. **Static JSON files** pre-computed at build time

### Decision
**Static JSON files** delivered from CDN.

### Rationale
- Data changes infrequently (monthly updates at most)
- Zero server cost (Cloudflare Pages free tier)
- Instant global CDN delivery
- No cold starts or API latency
- Simpler deployment (just file upload)

### Consequences
- **Pro:** Zero ongoing infrastructure cost
- **Pro:** Maximum performance (CDN-cached)
- **Pro:** No auth complexity for read-only data
- **Con:** Data refresh requires full rebuild + deploy
- **Con:** Large files (deputies.json = 7MB) need chunking strategy for scale

---

## ADR-002: React Query for Server State

**Date:** 2026-01-06
**Status:** Accepted
**Context:** Need caching strategy for static JSON files.

### Options Considered
1. **useState + useEffect** with manual caching
2. **React Query** with staleTime: Infinity
3. **SWR** with static data config
4. **Zustand** for everything

### Decision
**React Query** with `staleTime: Infinity` for all data hooks.

### Rationale
- Built-in caching, deduplication, and background refetching
- `staleTime: Infinity` prevents unnecessary refetches for static data
- DevTools for debugging
- Handles loading/error states elegantly

### Consequences
- **Pro:** Clean separation of server vs client state
- **Pro:** Automatic request deduplication
- **Pro:** Easy to switch to API later (just change fetcher)
- **Con:** Extra dependency (but lightweight)

---

## ADR-003: Zustand for Client State

**Date:** 2026-01-06
**Status:** Accepted
**Context:** Need filter state persistence across sessions.

### Options Considered
1. **React Context** + localStorage
2. **Redux** with persistence middleware
3. **Zustand** with persist middleware
4. **Jotai** atoms

### Decision
**Zustand** with persist middleware for filters and favorites.

### Rationale
- Minimal boilerplate (vs Redux)
- Built-in persist middleware
- TypeScript-first with excellent inference
- Small bundle size (~1KB)

### Consequences
- **Pro:** Clean, minimal API
- **Pro:** localStorage sync automatic
- **Pro:** Easy to add new stores
- **Con:** Less ecosystem than Redux (acceptable for our scale)

---

## ADR-004: Feature Flags for Phased Launch

**Date:** 2026-01-08
**Status:** Accepted
**Context:** Need to ship dashboard incrementally while hiding incomplete features.

### Options Considered
1. **Git branches** per feature
2. **Environment variables** per deployment
3. **Config file** with compile-time flags
4. **Feature flag service** (LaunchDarkly, Split)

### Decision
**Config file** (`src/config/features.ts`) with TypeScript constants.

### Rationale
- Simple to implement and understand
- No external service cost
- Compile-time tree-shaking removes disabled code
- Easy for AI assistants to modify

### Consequences
- **Pro:** Zero cost, zero complexity
- **Pro:** Type-safe flag references
- **Pro:** Dead code elimination in production
- **Con:** No user-level targeting (acceptable for MVP)
- **Con:** Requires redeploy to change flags

---

## ADR-005: Supabase for Auth + Voting

**Date:** 2026-01-10
**Status:** Accepted
**Context:** Need Google OAuth for voting feature without building auth from scratch.

### Options Considered
1. **Auth0** (managed auth)
2. **Firebase Auth** (Google ecosystem)
3. **Supabase** (Postgres + Auth + Realtime)
4. **Custom JWT** implementation

### Decision
**Supabase** for auth, database, and realtime subscriptions.

### Rationale
- Google OAuth out of the box
- PostgreSQL for vote storage (familiar, powerful)
- Realtime subscriptions for live leaderboard
- Generous free tier (50k MAU)
- Row Level Security for safe client-side queries

### Consequences
- **Pro:** Complete auth + database solution
- **Pro:** Real-time vote updates
- **Pro:** RLS means safe client queries
- **Con:** Another service dependency
- **Con:** Needs graceful degradation if not configured

---

## ADR-006: D3.js for Visualizations

**Date:** 2026-01-06
**Status:** Accepted
**Context:** Need flexible charting for custom analytics visualizations.

### Options Considered
1. **Chart.js** (canvas-based, simple)
2. **Recharts** (React wrapper for D3)
3. **D3.js** (low-level, maximum flexibility)
4. **Observable Plot** (D3-based, opinionated)
5. **Plotly** (interactive, heavier)

### Decision
**D3.js** directly with React integration.

### Rationale
- Maximum customization for unique chart types (Benford, HHI, Network)
- Educational value (showing how charts work)
- No abstraction overhead
- Large community and examples

### Consequences
- **Pro:** Full control over every pixel
- **Pro:** Can implement any visualization
- **Con:** More code per chart
- **Con:** Steeper learning curve for contributors
- **Con:** Need careful React integration (refs, useEffect cleanup)

---

## ADR-007: Cloudflare Pages for Hosting

**Date:** 2026-01-11
**Status:** Accepted
**Context:** Need reliable, fast hosting for static React app with large data files.

### Options Considered
1. **Vercel** (great DX, limited free tier)
2. **Netlify** (established, good free tier)
3. **Cloudflare Pages** (unlimited bandwidth free)
4. **GitHub Pages** (simple but limited)
5. **AWS S3 + CloudFront** (flexible but complex)

### Decision
**Cloudflare Pages** with custom domain.

### Rationale
- Unlimited bandwidth on free tier (critical for 7MB data files)
- Global CDN with excellent performance
- Native Wrangler CLI for deployment
- Domain already on Cloudflare Registrar
- SPA routing config via wrangler.toml

### Consequences
- **Pro:** Zero bandwidth cost regardless of traffic
- **Pro:** Fastest global CDN
- **Pro:** Easy rollbacks via dashboard
- **Con:** Less DX polish than Vercel
- **Con:** Preview URLs less convenient than Vercel

---

## ADR-008: Spotlight Voting - localStorage vs Supabase

**Date:** 2026-01-12
**Status:** **PENDING REVISION**
**Context:** Spotlight debate pages need voting to drive engagement.

### Current Implementation (localStorage)
- Votes stored in browser localStorage
- No aggregation or social proof
- Lost on browser clear

### Problem
- Can't show "67% voted for investigation" (no central data)
- No authentication = unlimited votes
- No analytics on engagement

### Proposed Revision
Migrate to Supabase (same as `/votar` page):
- Create `spotlight_votes` table
- Reuse `useAuth()` for Google sign-in
- Create `spotlight_vote_counts` view for aggregation
- Show percentages after voting

**Status:** Implementation planned, pending approval.

---

## ADR-009: Two-System Voting Architecture

**Date:** 2026-01-13
**Status:** Under Review
**Context:** Dashboard has two different voting systems that evolved separately.

### Current State

| System | Purpose | Auth | Storage | Aggregation |
|--------|---------|------|---------|-------------|
| Weekly Voting (`/votar`) | Vote for next investigation | Google OAuth | Supabase | Yes (leaderboard) |
| Spotlight Debate | Opinion on current case | None | localStorage | No |

### Problem
- Inconsistent UX (one requires login, one doesn't)
- Spotlight votes have no social proof
- Maintenance burden of two systems

### Options
1. **Keep separate** - Different purposes, different needs
2. **Unify to Supabase** - Consistent auth and aggregation
3. **Unify to localStorage** - Simple but loses analytics

### Recommendation
**Option 2: Unify to Supabase** for spotlight votes while keeping weekly voting separate.

**Rationale:**
- Spotlight voting benefits from social proof ("67% agree")
- Requires Google login (data quality)
- Weekly voting remains distinct (different UX: search + vote vs. binary choice)

---

## ADR-010: GenAI Development Documentation

**Date:** 2026-01-13
**Status:** Accepted
**Context:** Project is developed primarily with Claude Code. Need documentation optimized for AI understanding.

### Decision
Create `CLAUDE_CODE.md` in dashboard root with:
- Component inventory with usage patterns
- Hook reference with import examples
- Feature flag status table
- Common patterns (how to add chart, page, hook)
- Known issues / technical debt

### Rationale
- Reduces context-building time each session
- Prevents AI from recreating existing components
- Documents decisions that would otherwise be lost
- Makes handoffs between sessions seamless

### Consequences
- **Pro:** Faster AI-assisted development
- **Pro:** Better consistency across sessions
- **Pro:** Living documentation that evolves with code
- **Con:** Maintenance overhead (must update when code changes)

---

## Future Decisions Pending

- **Data chunking strategy** - How to split deputies.json for faster initial load
- **Offline support** - Service worker for PWA functionality
- **i18n approach** - If expanding beyond PT-BR
- **Testing strategy** - Unit vs E2E balance
- **Analytics integration** - Privacy-respecting usage tracking

---

## Decision Template

```markdown
## ADR-XXX: [Title]

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXX
**Context:** [What is the issue that we're seeing that is motivating this decision?]

### Options Considered
1. [Option 1]
2. [Option 2]
3. [Option 3]

### Decision
[Which option was chosen]

### Rationale
[Why this option was chosen over others]

### Consequences
- **Pro:** [Positive outcome]
- **Con:** [Negative outcome or trade-off]
```
