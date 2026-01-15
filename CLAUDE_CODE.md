# CLAUDE_CODE.md - Dashboard Development Context

This file provides AI-first development context for the CEAP Dashboard React application.
Use this as your primary reference when working on the dashboard codebase.

---

## Quick Start

```bash
cd dashboard
npm run dev      # Start dev server on :5173
npm run build    # TypeScript + Vite production build
npm run lint     # ESLint check
npm run deploy   # Build + deploy to Cloudflare Pages
```

**Production URL:** https://ceap.escoladados.com

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Static JSON Files                         │
│    /public/data/*.json (pre-computed by Python notebooks)   │
└─────────────────────┬───────────────────────────────────────┘
                      │ fetch()
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   React Query                                │
│    Hooks: useAggregations, useDeputies, useFraudFlags       │
│    Config: staleTime: Infinity (static data)                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Zustand Stores                             │
│    useFiltersStore (persisted to localStorage)               │
│    useFavoritesStore (persisted to localStorage)             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   React Components                           │
│    Pages → Feature Components → UI Components → Charts       │
└─────────────────────────────────────────────────────────────┘
```

---

## Feature Flags

Location: `src/config/features.ts`

| Flag | Status | Description |
|------|--------|-------------|
| `SHOW_METHODOLOGY_TAB` | ✅ ON | "Comece Aqui" educational section |
| `SHOW_SPOTLIGHT` | ✅ ON | Case study deep-dives |
| `SHOW_VOTING_TAB` | ✅ ON | Weekly deputy voting |
| `SHOW_DATA_MODEL_TAB` | ✅ ON | ER diagrams (Em Breve section) |
| `SHOW_DEPUTIES_TAB` | ❌ OFF | Deputy list page (Phase 2) |
| `SHOW_PATTERNS_TAB` | ❌ OFF | Pattern detection (Phase 3) |
| `SHOW_NETWORK_TAB` | ❌ OFF | Network analysis (Phase 4) |

**To enable a feature:** Edit `src/config/features.ts` and set flag to `true`.

---

## Data Files

Location: `/public/data/`

| File | Size | Description |
|------|------|-------------|
| `deputies.json` | 7 MB | All deputies with metrics, risk scores, breakdowns |
| `aggregations.json` | 13 KB | Global stats: totals, byMonth, byCategory, byParty, byState |
| `fraud-flags.json` | 270 KB | Risk assessments per deputy |
| `mismatches.json` | 30 KB | CNPJ activity mismatches |
| `manifest.json` | 2 KB | Data provenance and methodology parameters |
| `spotlights/*.json` | Varies | Pre-generated case study data |

**Data refresh:** Run Python notebooks in `/analysis/`, then copy outputs to `/dashboard/public/data/`.

---

## Hooks Reference

### Data Fetching (React Query)

```typescript
// Global aggregations
import { useAggregations } from '../hooks/useAggregations';
const { data, isLoading, error } = useAggregations();

// Derived hooks (convenience)
import { useTotalSpending, useTotalDeputies, useMonthlyData, useCategoryData, usePartyData, useStateData } from '../hooks/useAggregations';

// Deputy list
import { useDeputies } from '../hooks/useDeputies';
const { data: deputies, isLoading } = useDeputies();

// Fraud flags
import { useFraudFlags } from '../hooks/useFraudFlags';
const { data: flags } = useFraudFlags();
```

### State Management (Zustand)

```typescript
// Filters (persisted to localStorage)
import { useFiltersStore } from '../store/filters';
const { years, states, parties, toggleYear, clearFilters, hasActiveFilters } = useFiltersStore();

// Favorites
import { useFavoritesStore } from '../store/favorites';
```

### Authentication & Voting (Supabase)

```typescript
// Auth
import { useAuth } from '../hooks/useVoting';
const { user, isAuthenticated, signInWithGoogle, signOut, isConfigured } = useAuth();

// Weekly voting
import { useSubmitVote, useHasVotedThisWeek, useVoteLeaderboard } from '../hooks/useVoting';

// Spotlight voting (debate pages)
import { useSpotlightVoting, type SpotlightVoteOption } from '../hooks/useSpotlightVoting';
const voting = useSpotlightVoting(slug);
// voting.isAuthenticated, voting.user, voting.hasVoted, voting.userVote
// voting.voteCounts, voting.submitVote(option), voting.submitLoading
// voting.signInWithGoogle()
```

### Utilities

```typescript
// Virtual list for large lists
import { useVirtualList } from '../hooks/useVirtualList';
```

---

## Component Inventory

### Layout Components
- `MainLayout.tsx` - Master wrapper with sidebar and header
- `Header.tsx` - Page title, search trigger, theme toggle
- `Sidebar.tsx` - Navigation (reads feature flags)

### UI Primitives (`/components/ui/`)
| Component | Purpose |
|-----------|---------|
| `Button.tsx` | Standard button with variants |
| `ChartCard.tsx` | Container for charts with title, subtitle, tooltip |
| `Skeleton.tsx` | Loading placeholder |
| `EmptyState.tsx` | Empty data state with icon and message |
| `ErrorBoundary.tsx` | React error boundary wrapper |
| `LockedSection.tsx` | Subscriber-gated content preview |
| `LoadingBar.tsx` | Top progress bar |
| `ThemeToggle.tsx` | Dark/light mode switch |
| `DataFreshness.tsx` | Data last-updated indicator |

### Chart Components (`/components/charts/`)
47 chart components using D3.js. Key ones:

| Component | Use Case |
|-----------|----------|
| `BenfordChart.tsx` | First-digit distribution vs expected |
| `HHIChart.tsx` | Supplier concentration visualization |
| `SpendingTimeline.tsx` | Monthly spending line chart |
| `CategoryBreakdown.tsx` | Pie/bar by expense category |
| `PartyComparison.tsx` | Party-level aggregations |
| `BrazilChoropleth.tsx` | Geographic map visualization |
| `NetworkGraph.tsx` | Deputy-supplier network |
| `RiskRadar.tsx` | Multi-axis risk visualization |

### Spotlight Components (`/components/spotlight/`)
| Component | Purpose |
|-----------|---------|
| `SpotlightDebate.tsx` | Two-column prosecutor vs defense with voting |
| `SpotlightEmendasPivot.tsx` | **NEW** Interactive pivot table for emendas analysis |
| `SpotlightInvestigationTimeline.tsx` | Multi-phase investigation timeline |
| `SpotlightScaleComparison.tsx` | CEAP vs Emendas scale comparison |
| `SpotlightBancoBrasil.tsx` | Banco do Brasil concentration analysis |
| `SpotlightEmendasPix.tsx` | Emendas PIX (Transferências Especiais) explainer |
| `SpotlightDeputyComparison.tsx` | Side-by-side deputy metrics comparison |
| `SpotlightKeyFindings.tsx` | Summary cards for key findings |
| `SpotlightNarrativeHook.tsx` | Story hook with dramatic opening |
| `SpotlightTimeline.tsx` | Investigation timeline |
| `SpotlightBenford.tsx` | Deputy Benford analysis |
| `SpotlightComparison.tsx` | Cross-deputy metrics |
| `SpotlightTransactions.tsx` | Transaction explorer |
| `SpotlightCategories.tsx` | Category breakdown |

### Voting Components (`/components/voting/`)
| Component | Purpose |
|-----------|---------|
| `DeputyVoteCard.tsx` | Vote submission card |
| `VoteLeaderboard.tsx` | Weekly leaderboard display |

---

## Type Definitions

Location: `src/types/data.ts`

### Core Types
```typescript
type RiskLevel = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAIXO';

interface Deputy {
  id: number;
  name: string;
  party: string;
  uf: string;
  totalSpending: number;
  transactionCount: number;
  avgTicket: number;
  hhi: { value: number; level: RiskLevel };
  benford: { chi2: number; pValue: number; significant: boolean };
  riskScore: number;
  riskLevel: RiskLevel;
  topSuppliers: SupplierShare[];
  redFlags: string[];
  // ... more fields
}

interface Aggregations {
  meta: { totalTransactions, totalSpending, totalDeputies, totalSuppliers, period, lastUpdated };
  byMonth: MonthlyData[];
  byCategory: CategoryData[];
  byParty: PartyData[];
  byState: StateData[];
}

interface FraudFlag {
  deputyId: number;
  deputyName: string;
  flags: string[];
  riskScore: number;
  riskLevel: RiskLevel;
}

interface CNPJMismatch {
  cnpj: string;
  supplierName: string;
  expenseCategory: string;
  cnaePrincipal: string;
  reason: string;
}
```

---

## Common Patterns

### Adding a New Chart

1. Create component in `src/components/charts/NewChart.tsx`
2. Use `ChartCard` wrapper for consistent styling
3. Fetch data via appropriate hook
4. Use D3 for rendering (see existing charts for patterns)

```typescript
import { ChartCard } from '../ui/ChartCard';
import { useCategoryData } from '../../hooks/useAggregations';

export function NewChart() {
  const data = useCategoryData();

  return (
    <ChartCard
      title="Chart Title"
      subtitle="Optional subtitle"
      tooltip="Explanation text"
    >
      {/* D3 visualization or content */}
    </ChartCard>
  );
}
```

### Adding a New Page

1. Create page in `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`
3. Add feature flag in `src/config/features.ts`
4. Add navigation item in `getNavSections()`

### Adding a New Hook

1. Create in `src/hooks/useNewHook.ts`
2. For server data: use React Query with `staleTime: Infinity`
3. For client state: use Zustand store
4. Export from hook file

### Working with Supabase

Check configuration before using:
```typescript
import { supabase, isSupabaseConfigured } from '../lib/supabase';

if (!isSupabaseConfigured) {
  // Show graceful fallback
  return <ComingSoonMessage />;
}
// Proceed with Supabase operations
```

### In-App Browser Detection

Google OAuth doesn't work in in-app browsers (Instagram, Facebook, etc.). Use detection utilities:

```typescript
import { isInAppBrowser, getInAppBrowserName } from '../lib/supabase';

// Check if running in in-app browser
if (isInAppBrowser()) {
  const browserName = getInAppBrowserName(); // "Instagram", "Facebook", etc.
  // Show warning to open in Safari/Chrome
}
```

Detected browsers: Instagram, Facebook, LinkedIn, Threads, Twitter/X, TikTok, WhatsApp, Telegram, LINE, Snapchat

---

## Known Issues / Technical Debt

1. **Components defined inside render** - `Deputies.tsx`, `Button.tsx` have inner component definitions
2. **setState in useEffect** - `FeedbackModal.tsx`, `StatisticalInsights.tsx` trigger React warnings
3. **Non-component exports** - `AnalysisTabs.tsx`, `SpotlightMetrics.tsx` export objects/constants
4. **Large deputies.json** - 7MB file could be chunked for faster initial load

---

## Deployment

**Platform:** Cloudflare Pages (free tier)
**Config:** `wrangler.toml`

```bash
npm run deploy          # Production deploy
npm run deploy:preview  # Staging deploy
```

**Environment Variables (Cloudflare Dashboard):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key

---

## Testing

```bash
npm run test:e2e        # Playwright end-to-end tests
npx playwright test     # Run specific tests
```

Test files in `/tests/` or `*.spec.ts` files.

---

## Related Documentation

- `../PROJECT.md` - Project objectives and scope
- `../DATA_MODEL.md` - Data schema and relationships
- `../DEPLOYMENT_PLAN.md` - Infrastructure details
- `../INVESTIGATION.md` - CNPJ mismatch analysis audit
- `/public/data/manifest.json` - Data provenance and methodology

---

## AI Assistant Notes

When working on this codebase:

1. **Always check feature flags** before implementing new features
2. **Use existing hooks** - don't recreate data fetching logic
3. **Follow ChartCard pattern** for new visualizations
4. **Check Supabase config** before auth/voting features
5. **Data is static** - changes require Python notebook re-run
6. **Brazilian Portuguese** - UI text should be in PT-BR
7. **Accessibility matters** - use semantic HTML, aria labels
8. **Mobile-first** - test responsive behavior

### Common Tasks

| Task | Steps |
|------|-------|
| Enable a feature | Edit `src/config/features.ts`, set flag to `true` |
| Add data field | Update Python notebook → regenerate JSON → update TypeScript types |
| New spotlight page | Create data in `/public/data/spotlights/`, add route, create content |
| Fix lint errors | `npm run lint`, address warnings in components |
