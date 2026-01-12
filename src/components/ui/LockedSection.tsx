import type { ReactNode } from 'react';
import { FEATURES } from '../../config/features';

interface LockedSectionProps {
  title: string;
  badgeText?: string;
  teaserContent: ReactNode;
  lockedContent: ReactNode;
  ctaTitle?: string;
  ctaDescription?: string;
  ctaButtonText?: string;
  ctaHref?: string;
}

/**
 * LockedSection - Displays content with a locked/subscriber-only section
 *
 * When UNLOCK_SUBSCRIBER_CONTENT is false:
 * - Shows teaser content fully visible
 * - Shows locked content blurred with a CTA overlay
 *
 * When UNLOCK_SUBSCRIBER_CONTENT is true:
 * - Shows all content without any locks or blur
 */
export function LockedSection({
  title,
  badgeText = 'ASSINANTES',
  teaserContent,
  lockedContent,
  ctaTitle = 'Conteudo Exclusivo',
  ctaDescription = 'Desbloqueie acesso ao conteudo completo e aprofunde seu conhecimento.',
  ctaButtonText = 'Quero Ser Assinante',
  ctaHref = '#',
}: LockedSectionProps) {
  const isUnlocked = FEATURES.UNLOCK_SUBSCRIBER_CONTENT;

  // If unlocked, render everything normally
  if (isUnlocked) {
    return (
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
        </div>
        {teaserContent}
        {lockedContent}
      </section>
    );
  }

  // Locked state - show teaser + blurred locked content with CTA
  return (
    <section className="space-y-6">
      {/* Header with badge */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
        <span className="subscriber-badge">
          <LockIcon className="w-3 h-3" />
          {badgeText}
        </span>
      </div>

      {/* Teaser content - fully visible */}
      {teaserContent}

      {/* Locked content container */}
      <div className="locked-container relative min-h-[400px]">
        {/* Gradient overlay at top of locked content */}
        <div className="locked-gradient-overlay" />

        {/* Blurred locked content */}
        <div className="locked-blur" aria-hidden="true">
          {lockedContent}
        </div>

        {/* CTA overlay */}
        <div className="locked-cta-overlay">
          <div className="locked-cta-card">
            <div className="lock-icon">
              <LockIconLarge />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {ctaTitle}
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              {ctaDescription}
            </p>
            <a
              href={ctaHref}
              className="locked-cta-button"
              aria-label={ctaButtonText}
            >
              {ctaButtonText}
              <ArrowRightIcon className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// Small lock icon for badge
function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// Large lock icon for CTA
function LockIconLarge() {
  return (
    <svg
      className="w-full h-full"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

// Arrow icon for CTA button
function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
      />
    </svg>
  );
}
