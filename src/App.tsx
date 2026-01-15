import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from './components/layout/MainLayout';
import { ShortcutsModal, useKeyboardShortcuts } from './components/ui/ShortcutsModal';
import { LoadingBar } from './components/ui/LoadingBar';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { SkipLink } from './components/ui/SkipLink';
import { ThemeProvider } from './contexts/ThemeContext';
import { FEATURES } from './config/features';

// Lazy-load pages for better initial bundle size
const Overview = lazy(() => import('./pages/Overview').then(m => ({ default: m.Overview })));
const Deputies = lazy(() => import('./pages/Deputies').then(m => ({ default: m.Deputies })));
const DeputyProfile = lazy(() => import('./pages/DeputyProfile').then(m => ({ default: m.DeputyProfile })));
const Analysis = lazy(() => import('./pages/Analysis').then(m => ({ default: m.Analysis })));
const Network = lazy(() => import('./pages/Network').then(m => ({ default: m.Network })));
const Methodology = lazy(() => import('./pages/Methodology').then(m => ({ default: m.Methodology })));
const Spotlight = lazy(() => import('./pages/Spotlight').then(m => ({ default: m.Spotlight })));
const DataModel = lazy(() => import('./pages/DataModel').then(m => ({ default: m.DataModel })));
const Voting = lazy(() => import('./pages/Voting').then(m => ({ default: m.Voting })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: Infinity,
      refetchOnWindowFocus: false,
      // Retry configuration with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

// Loading fallback for lazy components
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="space-y-3 text-center">
        <div className="w-8 h-8 border-2 border-accent-teal border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-text-muted">Carregando...</p>
      </div>
    </div>
  );
}

// Route guard component for feature flags
function FeatureRoute({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  if (!enabled) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

// Keyboard shortcuts wrapper
function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { shortcutsOpen, setShortcutsOpen } = useKeyboardShortcuts(navigate);

  return (
    <>
      <SkipLink />
      <LoadingBar />
      {children}
      <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultMode="light">
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <KeyboardShortcutsProvider>
            <Routes>
            <Route path="/" element={<MainLayout />}>
              {/* Overview - Always enabled */}
              <Route
                index
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Overview />
                  </Suspense>
                }
              />

              {/* Deputies - Phase 2 */}
              <Route
                path="deputados"
                element={
                  <FeatureRoute enabled={FEATURES.SHOW_DEPUTIES_TAB}>
                    <Suspense fallback={<PageLoader />}>
                      <Deputies />
                    </Suspense>
                  </FeatureRoute>
                }
              />
              <Route
                path="deputado/:id"
                element={
                  <FeatureRoute enabled={FEATURES.SHOW_DEPUTIES_TAB}>
                    <Suspense fallback={<PageLoader />}>
                      <DeputyProfile />
                    </Suspense>
                  </FeatureRoute>
                }
              />

              {/* Patterns/Analysis - Phase 3 */}
              <Route
                path="padrões"
                element={
                  <FeatureRoute enabled={FEATURES.SHOW_PATTERNS_TAB}>
                    <Suspense fallback={<PageLoader />}>
                      <Analysis />
                    </Suspense>
                  </FeatureRoute>
                }
              />
              <Route
                path="análise"
                element={
                  <FeatureRoute enabled={FEATURES.SHOW_PATTERNS_TAB}>
                    <Suspense fallback={<PageLoader />}>
                      <Analysis />
                    </Suspense>
                  </FeatureRoute>
                }
              />

              {/* Network - Phase 4 */}
              <Route
                path="rede"
                element={
                  <FeatureRoute enabled={FEATURES.SHOW_NETWORK_TAB}>
                    <Suspense fallback={<PageLoader />}>
                      <Network />
                    </Suspense>
                  </FeatureRoute>
                }
              />

              {/* Methodology - Phase 4 */}
              <Route
                path="metodologia"
                element={
                  <FeatureRoute enabled={FEATURES.SHOW_METHODOLOGY_TAB}>
                    <Suspense fallback={<PageLoader />}>
                      <Methodology />
                    </Suspense>
                  </FeatureRoute>
                }
              />

              {/* Spotlight - Phase 5 */}
              <Route
                path="spotlight"
                element={
                  <FeatureRoute enabled={FEATURES.SHOW_SPOTLIGHT}>
                    <Suspense fallback={<PageLoader />}>
                      <Spotlight />
                    </Suspense>
                  </FeatureRoute>
                }
              />
              <Route
                path="spotlight/:slug"
                element={
                  <FeatureRoute enabled={FEATURES.SHOW_SPOTLIGHT}>
                    <Suspense fallback={<PageLoader />}>
                      <Spotlight />
                    </Suspense>
                  </FeatureRoute>
                }
              />

              {/* Data Model - Em Breve section */}
              <Route
                path="modelo-de-dados"
                element={
                  <FeatureRoute enabled={FEATURES.SHOW_DATA_MODEL_TAB}>
                    <Suspense fallback={<PageLoader />}>
                      <DataModel />
                    </Suspense>
                  </FeatureRoute>
                }
              />

              {/* Voting - Growth feature */}
              <Route
                path="votar"
                element={
                  <FeatureRoute enabled={FEATURES.SHOW_VOTING_TAB}>
                    <Suspense fallback={<PageLoader />}>
                      <Voting />
                    </Suspense>
                  </FeatureRoute>
                }
              />

              {/* 404 catch-all route */}
              <Route
                path="*"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <NotFound />
                  </Suspense>
                }
              />
              </Route>
            </Routes>
            </KeyboardShortcutsProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
