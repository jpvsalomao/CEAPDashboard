import { useState, useRef, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

interface TouchTooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

/**
 * Touch-friendly tooltip that works on both desktop (hover) and mobile (tap)
 * - Desktop: Shows on hover after optional delay
 * - Mobile: Shows on tap, dismisses on tap outside or after timeout
 */
export function TouchTooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  className = '',
}: TouchTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const dismissTimeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect touch device
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
  }, []);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    };
  }, []);

  // Handle click outside on mobile
  useEffect(() => {
    if (!isTouchDevice || !isVisible) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };

    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isTouchDevice, isVisible]);

  const showTooltip = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  }, []);

  const handleTap = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isTouchDevice) return;

    e.preventDefault();
    e.stopPropagation();

    setIsVisible((prev) => {
      const newVisible = !prev;

      // Auto-dismiss after 3 seconds on mobile
      if (newVisible) {
        if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
        dismissTimeoutRef.current = window.setTimeout(() => {
          setIsVisible(false);
        }, 3000);
      }

      return newVisible;
    });
  }, [isTouchDevice]);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-bg-card',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-bg-card',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-bg-card',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-bg-card',
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={!isTouchDevice ? showTooltip : undefined}
      onMouseLeave={!isTouchDevice ? hideTooltip : undefined}
      onFocus={!isTouchDevice ? showTooltip : undefined}
      onBlur={!isTouchDevice ? hideTooltip : undefined}
      onClick={isTouchDevice ? handleTap : undefined}
      onTouchEnd={isTouchDevice ? handleTap : undefined}
    >
      {children}

      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} pointer-events-none`}
          role="tooltip"
        >
          <div className="bg-bg-card border border-border-subtle rounded-lg shadow-lg px-3 py-2 text-sm text-text-primary max-w-xs whitespace-normal">
            {content}
            <div
              className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook to detect if the current device supports touch
 */
export function useIsTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();

    // Re-check on resize (some devices report touch capability dynamically)
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  return isTouchDevice;
}

/**
 * Info icon with tooltip - common pattern
 */
export function InfoTooltip({ content, className = '' }: { content: ReactNode; className?: string }) {
  return (
    <TouchTooltip content={content} position="top">
      <button
        type="button"
        className={`text-text-muted hover:text-text-secondary transition-colors ${className}`}
        aria-label="More information"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    </TouchTooltip>
  );
}

/**
 * Risk indicator with tooltip explaining the risk level
 */
export function RiskTooltip({
  level,
  value,
  className = '',
}: {
  level: 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAIXO';
  value?: number;
  className?: string;
}) {
  const explanations = {
    CRITICO: 'Concentração extrema (HHI > 3000). Mais de 60% dos gastos com um único fornecedor.',
    ALTO: 'Alta concentração (HHI 2500-3000). Possível dependência excessiva de poucos fornecedores.',
    MEDIO: 'Concentração moderada (HHI 1500-2500). Diversificação limitada.',
    BAIXO: 'Baixa concentração (HHI < 1500). Diversificação saudável de fornecedores.',
  };

  const colors = {
    CRITICO: 'text-accent-red',
    ALTO: 'text-accent-amber',
    MEDIO: 'text-accent-teal',
    BAIXO: 'text-green-500',
  };

  return (
    <TouchTooltip
      content={
        <div className="space-y-1">
          <p className="font-medium">{level}</p>
          <p className="text-text-secondary text-xs">{explanations[level]}</p>
          {value !== undefined && (
            <p className="text-xs text-text-muted">HHI: {value.toFixed(0)}</p>
          )}
        </div>
      }
      position="left"
    >
      <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${colors[level]} bg-current/10 ${className}`}>
        {level}
      </span>
    </TouchTooltip>
  );
}
