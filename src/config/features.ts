/**
 * Feature flags for phased launch
 *
 * Phase 1 (Week 1): Visão Geral only
 * Phase 2 (Week 2): + Deputados
 * Phase 3 (Week 3): + Padrões
 * Phase 4 (Week 4): + Rede, Metodologia
 * Phase 5 (Week 5+): + Spotlight
 *
 * To enable a phase, set the corresponding flags to true
 */

export const FEATURES = {
  // Phase 2
  SHOW_DEPUTIES_TAB: false,

  // Phase 3
  SHOW_PATTERNS_TAB: false,

  // Phase 4
  SHOW_NETWORK_TAB: false,
  SHOW_METHODOLOGY_TAB: true,

  // Phase 5
  SHOW_SPOTLIGHT: true,

  // Subscriber Content
  SHOW_SUBSCRIBER_PREVIEW: true,    // Show locked section with teaser
  UNLOCK_SUBSCRIBER_CONTENT: false, // Future: auth integration to unlock

  // Data Model (Em Breve section)
  SHOW_DATA_MODEL_TAB: true, // Show in Em Breve, accessible for development

  // Growth Features
  SHOW_VOTING_TAB: false, // Vote for next spotlight investigation (WIP - needs OAuth redirect fix)
} as const;

// Helper to check if a route should be accessible
export function isRouteEnabled(path: string): boolean {
  // Overview is always enabled
  if (path === '/' || path === '') return true;

  // Check each feature flag
  if (path.startsWith('/deputado')) return FEATURES.SHOW_DEPUTIES_TAB;
  if (path === '/deputados') return FEATURES.SHOW_DEPUTIES_TAB;
  if (path === '/padrões' || path === '/análise') return FEATURES.SHOW_PATTERNS_TAB;
  if (path === '/rede') return FEATURES.SHOW_NETWORK_TAB;
  if (path === '/metodologia') return FEATURES.SHOW_METHODOLOGY_TAB;
  if (path.startsWith('/spotlight')) return FEATURES.SHOW_SPOTLIGHT;
  if (path === '/votar') return FEATURES.SHOW_VOTING_TAB;
  if (path === '/modelo-de-dados') return FEATURES.SHOW_DATA_MODEL_TAB;

  return true; // Allow unknown routes (will hit 404)
}

// Navigation items filtered by feature flags
export interface NavItem {
  path: string;
  label: string;
  icon: string;
  enabled: boolean;
}

export interface NavSection {
  id: string;
  label?: string;  // undefined = no section header
  items: NavItem[];
}

export function getNavSections(): NavSection[] {
  return [
    // Comece Aqui - standalone at top, no section header
    {
      id: 'start',
      items: [
        { path: '/metodologia', label: 'Comece Aqui', icon: '📚', enabled: FEATURES.SHOW_METHODOLOGY_TAB },
      ].filter(i => i.enabled),
    },
    // Análise section
    {
      id: 'analysis',
      label: 'Análise',
      items: [
        { path: '/', label: 'Visão Geral', icon: '📊', enabled: true },
        { path: '/deputados', label: 'Deputados', icon: '👤', enabled: FEATURES.SHOW_DEPUTIES_TAB },
        { path: '/padrões', label: 'Padrões', icon: '🔍', enabled: FEATURES.SHOW_PATTERNS_TAB },
        { path: '/rede', label: 'Rede', icon: '🕸️', enabled: FEATURES.SHOW_NETWORK_TAB },
        { path: '/spotlight', label: 'Spotlight', icon: '🔦', enabled: FEATURES.SHOW_SPOTLIGHT },
      ].filter(i => i.enabled),
    },
    // Participe section
    {
      id: 'engage',
      label: 'Participe',
      items: [
        { path: '/votar', label: 'Votar', icon: '🗳️', enabled: FEATURES.SHOW_VOTING_TAB },
      ].filter(i => i.enabled),
    },
    // Em Breve section
    {
      id: 'coming-soon',
      label: 'Em Breve',
      items: [
        { path: '/modelo-de-dados', label: 'Modelo de Dados', icon: '🗄️', enabled: FEATURES.SHOW_DATA_MODEL_TAB },
      ].filter(i => i.enabled),
    },
  ].filter(section => section.items.length > 0);
}

// Legacy function for backward compatibility
export function getEnabledNavItems(): NavItem[] {
  return getNavSections().flatMap(section => section.items);
}
