import { useState } from 'react';
import { FeedbackModal } from './FeedbackModal';

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating feedback button */}
      <button
        onClick={() => setIsOpen(true)}
        className="
          fixed z-40
          bottom-6 right-4
          md:bottom-6 md:right-6
          flex items-center gap-2
          p-3
          md:px-4 md:py-2.5
          bg-bg-card/95 backdrop-blur-sm
          border border-border
          rounded-full
          shadow-lg shadow-black/25
          text-text-secondary hover:text-text-primary
          hover:bg-bg-secondary hover:border-text-muted
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-accent-teal focus:ring-offset-2 focus:ring-offset-bg-primary
          group
          no-print
        "
        aria-label="Enviar feedback"
        title="Enviar feedback"
      >
        {/* Message icon */}
        <svg
          className="w-5 h-5 text-accent-teal group-hover:scale-110 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        {/* Text - hidden on mobile */}
        <span className="hidden md:inline text-sm font-medium">
          Feedback
        </span>
      </button>

      {/* Modal */}
      <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
