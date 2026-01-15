import { useState, useEffect } from 'react';
import type { Deputy } from '../../types/data';
import { useAuth, useSubmitVote, useHasVotedThisWeek } from '../../hooks/useVoting';
import { MAX_SELECTIONS } from '../../types/voting';
import { isInAppBrowser, getInAppBrowserName } from '../../lib/supabase';

interface DeputyVoteCardProps {
  deputy: Deputy;
  onVoteSuccess?: () => void;
}

function getRiskColor(level: string) {
  switch (level) {
    case 'CRITICO':
      return 'bg-accent-red/20 text-accent-red border-accent-red/30';
    case 'ALTO':
      return 'bg-accent-amber/20 text-accent-amber border-accent-amber/30';
    case 'MEDIO':
      return 'bg-accent-teal/20 text-accent-teal border-accent-teal/30';
    default:
      return 'bg-status-low/20 text-status-low border-status-low/30';
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function DeputyVoteCard({ deputy, onVoteSuccess }: DeputyVoteCardProps) {
  const { user, isAuthenticated, signInWithGoogle, isConfigured } = useAuth();
  const { submitVote, loading: submitting, error, reset } = useSubmitVote();
  const { voteCount, hasVotedFor, canVote, loading: checkingVote } = useHasVotedThisWeek();

  // Detect in-app browser (Google OAuth doesn't work in these)
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [inAppBrowserName, setInAppBrowserName] = useState<string | null>(null);

  useEffect(() => {
    setInAppBrowser(isInAppBrowser());
    setInAppBrowserName(getInAppBrowserName());
  }, []);

  const votedForThisDeputy = hasVotedFor(deputy.id);

  const handleVote = async () => {
    const result = await submitVote(deputy.id, deputy.name);
    if (result && onVoteSuccess) {
      onVoteSuccess();
    }
  };

  // Not configured state
  if (!isConfigured) {
    return (
      <div className="glass-card p-6">
        <div className="text-center py-4">
          <p className="text-text-muted text-sm">
            Sistema de votação em configuração...
          </p>
        </div>
      </div>
    );
  }

  // Card styling based on vote state
  const cardClass = votedForThisDeputy
    ? "glass-card p-6 border-2 border-accent-teal/50 ring-1 ring-accent-teal/20"
    : "glass-card p-6";

  return (
    <div className={cardClass}>
      <DeputyHeader deputy={deputy} votedFor={votedForThisDeputy} />

      <div className="mt-4 pt-4 border-t border-border-subtle">
        {error && (
          <div className="mb-4 p-3 bg-accent-red/10 border border-accent-red/30 rounded-lg">
            <p className="text-sm text-accent-red">{error}</p>
            <button
              onClick={reset}
              className="text-xs text-accent-red/70 hover:text-accent-red mt-1"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Voted for this deputy - show confirmation */}
        {votedForThisDeputy ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 py-2">
              <svg className="w-5 h-5 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-accent-teal font-medium">Voto registrado!</span>
            </div>
            <p className="text-xs text-text-muted text-center">
              {voteCount}/{MAX_SELECTIONS} votos usados esta semana
            </p>
            <button
              onClick={() => {
                const text = `Votei para investigar ${deputy.name} no Dashboard CEAP! Vote você também: ${window.location.href}`;
                if (navigator.share) {
                  navigator.share({ text, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(text);
                }
              }}
              className="w-full px-4 py-2 bg-bg-secondary hover:bg-bg-primary text-text-secondary rounded-lg text-sm transition-colors"
            >
              Compartilhar
            </button>
          </div>
        ) : !isAuthenticated ? (
          <div className="space-y-3">
            {inAppBrowser ? (
              <>
                <div className="p-3 bg-accent-amber/10 border border-accent-amber/30 rounded-lg">
                  <p className="text-sm text-accent-amber font-medium mb-1">
                    Abra no navegador para votar
                  </p>
                  <p className="text-xs text-text-muted mb-3">
                    O login com Google nao funciona no {inAppBrowserName}.
                    Copie o link e abra no Safari ou Chrome.
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Link copiado! Cole no Safari ou Chrome.');
                    }}
                    className="w-full px-3 py-2 bg-accent-amber/20 hover:bg-accent-amber/30 text-accent-amber rounded-lg text-sm font-medium transition-colors"
                  >
                    Copiar link
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-text-muted text-center">
                  Entre com Google para votar
                </p>
                <button
                  onClick={() => signInWithGoogle()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-800 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Entrar com Google
                </button>
              </>
            )}
          </div>
        ) : !canVote ? (
          <div className="space-y-3">
            <p className="text-xs text-text-muted text-center">
              Logado como {user?.email}
            </p>
            <div className="text-center py-2">
              <p className="text-text-muted text-sm">
                Você já usou seus {MAX_SELECTIONS} votos esta semana.
              </p>
              <p className="text-xs text-text-muted mt-1">
                Volte na próxima semana para votar novamente!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-text-muted text-center">
              Logado como {user?.email} · {voteCount}/{MAX_SELECTIONS} votos
            </p>
            <button
              onClick={handleVote}
              disabled={submitting || checkingVote}
              className="w-full px-4 py-3 bg-accent-teal hover:bg-accent-teal/90 disabled:bg-accent-teal/50 text-bg-primary rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
                  Registrando voto...
                </span>
              ) : checkingVote ? (
                'Verificando...'
              ) : (
                'Votar neste deputado'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DeputyHeader({ deputy, votedFor = false }: { deputy: Deputy; votedFor?: boolean }) {
  return (
    <div className="space-y-4">
      {/* Name and basic info */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-lg font-semibold text-text-primary">
            {deputy.name}
          </h4>
          <p className="text-sm text-text-muted">
            {deputy.party} - {deputy.uf}
          </p>
        </div>
        {votedFor && (
          <span className="flex items-center gap-1 px-2 py-1 bg-accent-teal/20 text-accent-teal text-xs font-medium rounded">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Votado
          </span>
        )}
      </div>

      {/* Risk badge */}
      <div className="flex items-center gap-2">
        <span
          className={`px-2 py-1 text-xs font-medium rounded border ${getRiskColor(
            deputy.riskLevel
          )}`}
        >
          Risco {deputy.riskLevel}
        </span>
        <span className="text-xs text-text-muted">
          Score: {(deputy.riskScore * 100).toFixed(0)}%
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-bg-secondary p-3 rounded-lg">
          <p className="text-text-muted text-xs">Gasto Total</p>
          <p className="text-text-primary font-medium">
            {formatCurrency(deputy.totalSpending)}
          </p>
        </div>
        <div className="bg-bg-secondary p-3 rounded-lg">
          <p className="text-text-muted text-xs">HHI</p>
          <p className="text-text-primary font-medium">
            {deputy.hhi.value.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Red flags */}
      {deputy.redFlags.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-text-muted">Alertas:</p>
          <div className="flex flex-wrap gap-1">
            {deputy.redFlags.slice(0, 3).map((flag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-accent-red/10 text-accent-red text-xs rounded"
              >
                {flag}
              </span>
            ))}
            {deputy.redFlags.length > 3 && (
              <span className="px-2 py-0.5 bg-bg-secondary text-text-muted text-xs rounded">
                +{deputy.redFlags.length - 3}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
