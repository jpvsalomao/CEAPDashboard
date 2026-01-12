import { useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import type { NavLinkProps } from 'react-router-dom';

// Map routes to their lazy-loaded modules
const routeModules: Record<string, () => Promise<unknown>> = {
  '/': () => import('../../pages/Overview'),
  '/deputados': () => import('../../pages/Deputies'),
  '/padrões': () => import('../../pages/Analysis'),
  '/rede': () => import('../../pages/Network'),
  '/metodologia': () => import('../../pages/Methodology'),
};

// Track which routes have been preloaded
const preloadedRoutes = new Set<string>();

/**
 * NavLink that preloads the target route on hover/focus
 * This makes navigation feel instant
 */
export function PreloadNavLink({ to, children, ...props }: NavLinkProps) {
  const href = typeof to === 'string' ? to : to.pathname || '';

  const handlePreload = useCallback(() => {
    // Only preload routes we have module mappings for
    const basePath = '/' + href.split('/')[1]; // Get first segment
    const moduleLoader = routeModules[basePath] || routeModules[href];

    if (moduleLoader && !preloadedRoutes.has(href)) {
      preloadedRoutes.add(href);
      // Start loading the module
      moduleLoader().catch(() => {
        // Silently fail - the route will load normally on click
        preloadedRoutes.delete(href);
      });
    }
  }, [href]);

  return (
    <NavLink
      to={to}
      onMouseEnter={handlePreload}
      onFocus={handlePreload}
      {...props}
    >
      {children}
    </NavLink>
  );
}

/**
 * Hook for programmatic preloading
 */
export function usePreloadRoute() {
  return useCallback((path: string) => {
    const basePath = '/' + path.split('/')[1];
    const moduleLoader = routeModules[basePath] || routeModules[path];

    if (moduleLoader && !preloadedRoutes.has(path)) {
      preloadedRoutes.add(path);
      moduleLoader().catch(() => {
        preloadedRoutes.delete(path);
      });
    }
  }, []);
}

/**
 * Preload all main routes (useful on idle)
 */
export function preloadAllRoutes() {
  Object.entries(routeModules).forEach(([path, loader]) => {
    if (!preloadedRoutes.has(path)) {
      preloadedRoutes.add(path);
      // Use requestIdleCallback if available, otherwise setTimeout
      if ('requestIdleCallback' in window) {
        (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => {
          loader().catch(() => preloadedRoutes.delete(path));
        });
      } else {
        setTimeout(() => {
          loader().catch(() => preloadedRoutes.delete(path));
        }, 100);
      }
    }
  });
}
