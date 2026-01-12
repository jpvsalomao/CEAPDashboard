import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';

// Context to allow triggering loading bar from anywhere
interface LoadingBarContextValue {
  start: () => void;
  done: () => void;
}

const LoadingBarContext = createContext<LoadingBarContextValue | null>(null);

export function useLoadingBar() {
  return useContext(LoadingBarContext);
}

/**
 * Top loading bar that shows during route transitions
 * Similar to YouTube/GitHub loading indicator
 *
 * Uses useLocation to detect route changes instead of useNavigation
 * (useNavigation requires a data router which we don't use)
 */
export function LoadingBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const start = useCallback(() => {
    setVisible(true);
    setProgress(0);
  }, []);

  const done = useCallback(() => {
    setProgress(100);
    setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 200);
  }, []);

  // Show loading bar briefly on route changes
  useEffect(() => {
    start();

    // Animate progress
    const startTime = Date.now();
    const duration = 300;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const p = 1 - Math.exp(-elapsed / duration);
      setProgress(Math.min(p * 90, 90));

      if (elapsed < duration) {
        requestAnimationFrame(animate);
      } else {
        // Route transition complete
        done();
      }
    };

    requestAnimationFrame(animate);
  }, [location.pathname, start, done]);

  if (!visible) return null;

  return (
    <LoadingBarContext.Provider value={{ start, done }}>
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-transparent">
        <div
          className="h-full bg-accent-teal transition-all duration-200 ease-out"
          style={{
            width: `${progress}%`,
            boxShadow: '0 0 10px rgba(74, 163, 160, 0.7)',
          }}
        />
      </div>
    </LoadingBarContext.Provider>
  );
}

/**
 * Simple spinner for inline loading states
 */
export function Spinner({ size = 'md', className = '' }: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-accent-teal border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
}

/**
 * Loading overlay for charts and cards
 * Shows a semi-transparent overlay with spinner
 */
export function LoadingOverlay({
  message = 'Carregando...',
  variant = 'default'
}: {
  message?: string;
  variant?: 'default' | 'minimal';
}) {
  if (variant === 'minimal') {
    return (
      <div className="absolute inset-0 bg-bg-primary/50 backdrop-blur-sm flex items-center justify-center z-10">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-bg-primary/70 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fade-in">
      <Spinner size="lg" />
      <p className="text-sm text-text-muted mt-3">{message}</p>
    </div>
  );
}

/**
 * Inline data loading indicator
 * For showing loading state next to data values
 */
export function DataLoadingIndicator({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-text-muted ${className}`}>
      <span className="w-2 h-2 bg-accent-teal/50 rounded-full animate-pulse" />
      <span className="w-2 h-2 bg-accent-teal/50 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-accent-teal/50 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
    </span>
  );
}

/**
 * Full-page loading state for route transitions
 */
export function PageLoading({ message = 'Carregando pagina...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Spinner size="lg" />
      <p className="text-text-muted">{message}</p>
    </div>
  );
}
