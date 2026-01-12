import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [currentChildren, setCurrentChildren] = useState(children);
  const prevLocation = useRef(location.pathname);

  useEffect(() => {
    // Only animate if route actually changed
    if (prevLocation.current !== location.pathname) {
      // Start fade out
      setIsVisible(false);

      // After fade out, swap content and fade in
      const timer = setTimeout(() => {
        setCurrentChildren(children);
        setIsVisible(true);
        prevLocation.current = location.pathname;
      }, 150); // Match CSS transition duration

      return () => clearTimeout(timer);
    } else {
      // Same route, just update children
      setCurrentChildren(children);
    }
  }, [location.pathname, children]);

  return (
    <div
      className={`transition-all duration-150 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2'
      }`}
    >
      {currentChildren}
    </div>
  );
}

// Hook for scroll-to-top on navigation
export function useScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top smoothly on route change
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }, [pathname]);
}

// Combined wrapper for both features
export function PageWrapper({ children }: PageTransitionProps) {
  useScrollToTop();

  return (
    <PageTransition>
      {children}
    </PageTransition>
  );
}
