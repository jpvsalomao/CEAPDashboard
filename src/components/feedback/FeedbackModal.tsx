import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';

type FeedbackType = 'bug' | 'suggestion' | 'question';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xkoonnap';

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('suggestion');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setErrorMessage('');
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-close after success
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        onClose();
        // Reset form after close animation
        setTimeout(() => {
          setEmail('');
          setFeedbackType('suggestion');
          setMessage('');
          setStatus('idle');
        }, 300);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email,
          type: feedbackType,
          message,
          page_url: window.location.href,
          page_path: location.pathname,
          submitted_at: new Date().toISOString(),
          user_agent: navigator.userAgent,
        }),
      });

      if (response.ok) {
        setStatus('success');
      } else {
        const data = await response.json();
        setErrorMessage(data.error || 'Erro ao enviar feedback. Tente novamente.');
        setStatus('error');
      }
    } catch {
      setErrorMessage('Erro de conexão. Verifique sua internet e tente novamente.');
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  const feedbackTypeLabels: Record<FeedbackType, { label: string; emoji: string }> = {
    bug: { label: 'Bug', emoji: '🐛' },
    suggestion: { label: 'Sugestão', emoji: '💡' },
    question: { label: 'Dúvida', emoji: '❓' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Envie seu feedback
            </h2>
            <p className="text-sm text-text-muted mt-0.5">
              Bugs, sugestões ou dúvidas
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Fechar modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {status === 'success' ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-accent-teal/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Obrigado!
            </h3>
            <p className="text-text-secondary">
              Seu feedback foi enviado. Responderemos em breve.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="feedback-email" className="block text-sm font-medium text-text-primary mb-1.5">
                Email
              </label>
              <input
                id="feedback-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-teal focus:border-transparent transition-all"
                disabled={status === 'submitting'}
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Tipo
              </label>
              <div className="flex gap-2">
                {(Object.keys(feedbackTypeLabels) as FeedbackType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFeedbackType(type)}
                    className={`
                      flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all
                      ${feedbackType === type
                        ? 'bg-accent-teal text-bg-primary'
                        : 'bg-bg-secondary text-text-secondary hover:bg-bg-card border border-border'
                      }
                    `}
                    disabled={status === 'submitting'}
                  >
                    <span className="mr-1.5">{feedbackTypeLabels[type].emoji}</span>
                    {feedbackTypeLabels[type].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="feedback-message" className="block text-sm font-medium text-text-primary mb-1.5">
                Mensagem
              </label>
              <textarea
                id="feedback-message"
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  feedbackType === 'bug'
                    ? 'Descreva o problema que encontrou...'
                    : feedbackType === 'suggestion'
                    ? 'O que podemos melhorar?'
                    : 'Qual sua dúvida?'
                }
                rows={4}
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-teal focus:border-transparent transition-all resize-none"
                disabled={status === 'submitting'}
              />
            </div>

            {/* Error message */}
            {status === 'error' && (
              <div className="p-3 bg-accent-red/10 border border-accent-red/30 rounded-lg text-sm text-accent-red">
                {errorMessage}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={status === 'submitting'}
            >
              Enviar feedback
            </Button>
          </form>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-bg-secondary">
          <p className="text-xs text-text-muted text-center">
            Seu email será usado apenas para responder ao feedback.
          </p>
        </div>
      </div>
    </div>
  );
}
