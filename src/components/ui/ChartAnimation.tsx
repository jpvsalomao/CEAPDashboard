import { useEffect, useState, useRef } from 'react';

interface ChartAnimationProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Animates chart entrance when it comes into view
 * Uses IntersectionObserver for performance
 */
export function ChartAnimation({ children, delay = 0, className = '' }: ChartAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Add delay before showing
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
          // Disconnect after first intersection
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-4 scale-[0.98]'
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Staggered animation for multiple charts in a row
 */
export function StaggeredCharts({ children, baseDelay = 0, stagger = 100 }: {
  children: React.ReactNode[];
  baseDelay?: number;
  stagger?: number;
}) {
  return (
    <>
      {children.map((child, index) => (
        <ChartAnimation key={index} delay={baseDelay + index * stagger}>
          {child}
        </ChartAnimation>
      ))}
    </>
  );
}

/**
 * Counter animation for numbers
 */
export function AnimatedCounter({
  value,
  duration = 1000,
  formatter = (n: number) => n.toString(),
}: {
  value: number;
  duration?: number;
  formatter?: (n: number) => string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);

  useEffect(() => {
    const startValue = previousValue.current;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);

      const current = startValue + (value - startValue) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previousValue.current = value;
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{formatter(displayValue)}</span>;
}
