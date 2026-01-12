import type { ReactNode, CSSProperties } from 'react';

interface SkeletonProps {
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-bg-secondary rounded ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

interface ChartSkeletonProps {
  height?: number;
  type?: 'bar' | 'line' | 'pie' | 'network';
}

export function ChartSkeleton({ height = 300, type = 'bar' }: ChartSkeletonProps) {
  if (type === 'bar') {
    return (
      <div className="w-full" style={{ height }} aria-label="Carregando grafico...">
        <div className="flex items-end justify-between h-full gap-2 px-4 pb-8">
          {[65, 85, 45, 90, 55, 70, 40, 80, 60, 75].map((h, i) => (
            <div
              key={i}
              className="flex-1 animate-pulse bg-bg-secondary rounded-t"
              style={{ height: `${h}%`, animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
        {/* X-axis labels */}
        <div className="flex justify-between px-4 mt-2">
          {[1, 2, 3, 4, 5].map((_, i) => (
            <Skeleton key={i} className="w-12 h-3" />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'line') {
    return (
      <div className="w-full relative" style={{ height }} aria-label="Carregando grafico...">
        <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="skeleton-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(74, 163, 160, 0.1)" />
              <stop offset="50%" stopColor="rgba(74, 163, 160, 0.2)" />
              <stop offset="100%" stopColor="rgba(74, 163, 160, 0.1)" />
              <animate
                attributeName="x1"
                values="-100%;100%"
                dur="1.5s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="x2"
                values="0%;200%"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </linearGradient>
          </defs>
          <path
            d="M0,150 C50,120 100,160 150,100 C200,40 250,80 300,60 C350,40 400,90 400,70"
            fill="none"
            stroke="url(#skeleton-gradient)"
            strokeWidth="3"
            className="opacity-50"
          />
          <path
            d="M0,150 C50,120 100,160 150,100 C200,40 250,80 300,60 C350,40 400,90 400,70 L400,200 L0,200 Z"
            fill="url(#skeleton-gradient)"
            className="opacity-20"
          />
        </svg>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-4">
          {[1, 2, 3, 4].map((_, i) => (
            <Skeleton key={i} className="w-8 h-3" />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'network') {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ height }} aria-label="Carregando rede...">
        <div className="relative w-64 h-64">
          {/* Central node */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Skeleton className="w-12 h-12 rounded-full" />
          </div>
          {/* Surrounding nodes */}
          {[0, 60, 120, 180, 240, 300].map((angle, i) => {
            const x = Math.cos((angle * Math.PI) / 180) * 80;
            const y = Math.sin((angle * Math.PI) / 180) * 80;
            return (
              <div
                key={i}
                className="absolute top-1/2 left-1/2"
                style={{
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
              >
                <Skeleton
                  className="w-6 h-6 rounded-full"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              </div>
            );
          })}
          {/* Connection lines (as skeleton) */}
          <svg className="absolute inset-0 w-full h-full opacity-30">
            {[0, 60, 120, 180, 240, 300].map((angle, i) => {
              const x = Math.cos((angle * Math.PI) / 180) * 80 + 128;
              const y = Math.sin((angle * Math.PI) / 180) * 80 + 128;
              return (
                <line
                  key={i}
                  x1="128"
                  y1="128"
                  x2={x}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-bg-secondary animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              );
            })}
          </svg>
        </div>
      </div>
    );
  }

  // Default/pie skeleton
  return (
    <div className="w-full flex items-center justify-center" style={{ height }} aria-label="Carregando grafico...">
      <Skeleton className="w-48 h-48 rounded-full" />
    </div>
  );
}

interface StatCardSkeletonProps {
  count?: number;
}

export function StatCardSkeleton({ count = 4 }: StatCardSkeletonProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-4">
          <Skeleton className="w-20 h-8 mb-2" />
          <Skeleton className="w-24 h-4" />
        </div>
      ))}
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex gap-4 p-4 bg-bg-secondary rounded-t">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="flex-1 h-4" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 p-4 border-b border-border"
          style={{ animationDelay: `${rowIdx * 50}ms` }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              className="flex-1 h-4"
              style={{ animationDelay: `${(rowIdx * columns + colIdx) * 20}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
