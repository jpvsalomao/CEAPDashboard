/**
 * SpotlightDebate - Two-column debate renderer with voting
 * Shows prosecutor vs defense analysis with audience engagement
 *
 * Features:
 * - Google OAuth for voting (via Supabase)
 * - Real-time vote counts and percentages
 * - Pending vote mechanism (stores vote intent before OAuth redirect)
 * - Blurred teaser for non-authenticated users
 * - Graceful fallback when Supabase not configured (localStorage)
 */

import { useState, useEffect, useCallback } from 'react';
import type { DebateContent } from '../../pages/spotlight/SpotlightContent';
import { useSpotlightVoting, type SpotlightVoteOption } from '../../hooks/useSpotlightVoting';
import { isSupabaseConfigured, isInAppBrowser, getInAppBrowserName } from '../../lib/supabase';

interface SpotlightDebateProps {
  debate: DebateContent;
  slug: string;
}

// Key for storing pending vote before OAuth redirect
const getPendingVoteKey = (slug: string) => `spotlight-pending-vote-${slug}`;

export function SpotlightDebate({ debate, slug }: SpotlightDebateProps) {
  // Use Supabase voting when configured, otherwise fall back to localStorage
  const voting = useSpotlightVoting(slug);

  // Detect in-app browser (Google OAuth doesn't work in these)
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [inAppBrowserName, setInAppBrowserName] = useState<string | null>(null);

  useEffect(() => {
    setInAppBrowser(isInAppBrowser());
    setInAppBrowserName(getInAppBrowserName());
  }, []);

  // localStorage fallback state (when Supabase not configured)
  const [localVote, setLocalVote] = useState<SpotlightVoteOption | null>(() => {
    if (isSupabaseConfigured) return null;
    const storedVote = localStorage.getItem(`spotlight-vote-${slug}`);
    return storedVote as SpotlightVoteOption | null;
  });
  const [localHasVoted, setLocalHasVoted] = useState(() => {
    if (isSupabaseConfigured) return false;
    return !!localStorage.getItem(`spotlight-vote-${slug}`);
  });

  // Track if we're processing a pending vote
  const [processingPendingVote, setProcessingPendingVote] = useState(false);

  // Sync localStorage fallback when slug changes
  useEffect(() => {
    if (isSupabaseConfigured) return;
    const storedVote = localStorage.getItem(`spotlight-vote-${slug}`);
    if (storedVote) {
      setLocalVote(storedVote as SpotlightVoteOption);
      setLocalHasVoted(true);
    } else {
      setLocalVote(null);
      setLocalHasVoted(false);
    }
  }, [slug]);

  // Check for and process pending vote after OAuth redirect
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!voting.isAuthenticated) return;
    if (voting.hasVoted) return;
    if (processingPendingVote) return;

    const pendingVote = localStorage.getItem(getPendingVoteKey(slug));
    if (pendingVote && (pendingVote === 'investigar' || pendingVote === 'inconclusivo')) {
      setProcessingPendingVote(true);

      // Submit the pending vote
      voting.submitVote(pendingVote as SpotlightVoteOption).then((success) => {
        // Clear pending vote regardless of success
        localStorage.removeItem(getPendingVoteKey(slug));
        setProcessingPendingVote(false);

        if (!success) {
          console.error('Failed to submit pending vote');
        }
      });
    }
  }, [slug, voting.isAuthenticated, voting.hasVoted, voting.submitVote, processingPendingVote]);

  // Determine current state based on whether Supabase is configured
  const hasVoted = isSupabaseConfigured ? voting.hasVoted : localHasVoted;
  const currentVote = isSupabaseConfigured ? voting.currentVote : localVote;
  const isLoading = isSupabaseConfigured
    ? voting.authLoading || voting.voteStatusLoading || processingPendingVote
    : false;

  const handleVote = useCallback(async (option: SpotlightVoteOption) => {
    if (hasVoted) return;

    if (isSupabaseConfigured) {
      // Check if user is authenticated
      if (!voting.isAuthenticated) {
        // Store the pending vote before redirecting to OAuth
        localStorage.setItem(getPendingVoteKey(slug), option);

        // Trigger Google sign-in (will redirect back to current page)
        await voting.signInWithGoogle();
        return;
      }
      // User is authenticated, submit vote directly
      await voting.submitVote(option);
    } else {
      // localStorage fallback
      setLocalVote(option);
      setLocalHasVoted(true);
      localStorage.setItem(`spotlight-vote-${slug}`, option);
    }
  }, [hasVoted, voting, slug]);

  // Show counts if we have any votes (either user voted or there are existing votes)
  const hasCounts = voting.counts.total > 0;

  // Vote results component - reusable for both voted and teaser states
  const VoteResults = ({ blurred = false }: { blurred?: boolean }) => (
    <div className={`space-y-3 ${blurred ? 'select-none' : ''}`}>
      <p className="text-sm text-text-muted text-center">
        {voting.counts.total} {voting.counts.total === 1 ? 'pessoa votou' : 'pessoas votaram'}
      </p>
      <div className={`flex flex-col sm:flex-row gap-4 justify-center ${blurred ? 'blur-sm' : ''}`}>
        {/* Investigar bar */}
        <div className="flex-1 max-w-xs">
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>Justifica investigacao</span>
            <span className="font-medium text-accent-amber">{voting.percentages.investigar}%</span>
          </div>
          <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-amber transition-all duration-500"
              style={{ width: `${voting.percentages.investigar}%` }}
            />
          </div>
        </div>

        {/* Inconclusivo bar */}
        <div className="flex-1 max-w-xs">
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>Dados inconclusivos</span>
            <span className="font-medium text-accent-teal">{voting.percentages.inconclusivo}%</span>
          </div>
          <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-teal transition-all duration-500"
              style={{ width: `${voting.percentages.inconclusivo}%` }}
            />
          </div>
        </div>
      </div>
      {blurred && (
        <p className="text-xs text-accent-teal text-center mt-2">
          Vote para ver os resultados
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Two columns: Promotor | Defesa */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Promotor (amber/warning accent) */}
        <div className="bg-accent-amber/10 rounded-lg p-6 border-l-4 border-accent-amber">
          <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
            <span>⚠️</span>
            {debate.promotor.title}
          </h3>
          <p className="text-sm text-text-secondary mb-4 leading-relaxed">
            {debate.promotor.centralArgument}
          </p>
          <div className="space-y-3">
            {debate.promotor.evidence.map((ev, i) => (
              <div key={i} className="bg-bg-primary/50 rounded p-3">
                <h4 className="text-sm font-medium text-text-primary mb-1">
                  {ev.title}
                </h4>
                <p className="text-xs text-text-muted">{ev.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Defesa (teal accent) */}
        <div className="bg-accent-teal/10 rounded-lg p-6 border-l-4 border-accent-teal">
          <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
            <span>🛡️</span>
            {debate.defesa.title}
          </h3>
          <p className="text-sm text-text-secondary mb-4 leading-relaxed">
            {debate.defesa.centralArgument}
          </p>
          <div className="space-y-3">
            {debate.defesa.counterpoints.map((cp, i) => (
              <div key={i} className="bg-bg-primary/50 rounded p-3">
                <h4 className="text-sm font-medium text-text-primary mb-1">
                  Re: {cp.allegation}
                </h4>
                <p className="text-xs text-text-muted">{cp.alternative}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Open Questions */}
      <div className="bg-bg-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <span>❓</span>
          Perguntas em Aberto
        </h3>
        <p className="text-sm text-text-muted mb-4">
          Estas questoes so podem ser respondidas com investigacao formal ou acesso a documentos nao publicos:
        </p>
        <ul className="space-y-2">
          {debate.openQuestions.map((q, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
              <span className="text-accent-blue mt-0.5">•</span>
              {q}
            </li>
          ))}
        </ul>
      </div>

      {/* Vote CTA */}
      <div className="bg-accent-blue/10 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-2 text-center flex items-center justify-center gap-2">
          <span>🗳️</span>
          E voce, o que acha?
        </h3>
        <p className="text-sm text-text-muted text-center mb-4">
          Com base nos dados apresentados, qual sua conclusao?
        </p>

        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin w-6 h-6 border-2 border-accent-teal border-t-transparent rounded-full" />
            <p className="text-text-muted text-sm">
              {processingPendingVote ? 'Registrando seu voto...' : 'Carregando...'}
            </p>
          </div>
        ) : !hasVoted ? (
          <div className="space-y-4">
            {/* In-app browser warning */}
            {isSupabaseConfigured && inAppBrowser && !voting.isAuthenticated && (
              <div className="mb-4 p-4 bg-accent-amber/10 border border-accent-amber/30 rounded-lg">
                <p className="text-sm text-accent-amber font-medium mb-2">
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
                  className="w-full px-4 py-2 bg-accent-amber/20 hover:bg-accent-amber/30 text-accent-amber rounded-lg text-sm font-medium transition-colors"
                >
                  Copiar link
                </button>
              </div>
            )}

            {/* User status */}
            {isSupabaseConfigured && !inAppBrowser && (
              <div className="text-center">
                {voting.isAuthenticated ? (
                  <p className="text-xs text-text-muted">
                    Logado como <span className="text-text-secondary">{voting.user?.email}</span>
                  </p>
                ) : (
                  <p className="text-xs text-text-muted">
                    Clique para votar (login com Google)
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => handleVote('investigar')}
                disabled={voting.submitLoading || (inAppBrowser && !voting.isAuthenticated)}
                className="px-6 py-3 bg-accent-amber/20 hover:bg-accent-amber/30 text-accent-amber rounded-lg transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {voting.submitLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-accent-amber border-t-transparent rounded-full" />
                    Enviando...
                  </>
                ) : (
                  'Os dados justificam investigacao'
                )}
              </button>
              <button
                onClick={() => handleVote('inconclusivo')}
                disabled={voting.submitLoading || (inAppBrowser && !voting.isAuthenticated)}
                className="px-6 py-3 bg-accent-teal/20 hover:bg-accent-teal/30 text-accent-teal rounded-lg transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {voting.submitLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-accent-teal border-t-transparent rounded-full" />
                    Enviando...
                  </>
                ) : (
                  'Os dados sao inconclusivos'
                )}
              </button>
            </div>

            {voting.submitError && (
              <p className="text-xs text-red-500 text-center">{voting.submitError}</p>
            )}

            {/* Teaser: Show blurred results if there are votes but user hasn't voted */}
            {isSupabaseConfigured && hasCounts && !voting.countsLoading && (
              <div className="mt-6 pt-4 border-t border-border/50">
                <VoteResults blurred={true} />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center space-y-4">
            {/* Animated vote confirmation */}
            <div
              className={`inline-flex items-center gap-3 px-5 py-3 rounded-xl text-sm transition-all duration-500 ${
                voting.justVoted
                  ? 'animate-vote-success bg-gradient-to-r from-accent-teal/20 to-accent-blue/20 scale-105'
                  : 'bg-bg-secondary'
              }`}
            >
              <span className={`text-xl transition-transform duration-300 ${voting.justVoted ? 'animate-bounce' : ''}`}>
                {currentVote === 'investigar' ? '⚠️' : '🛡️'}
              </span>
              <div className="text-left">
                <p className="text-text-primary font-medium">Voto Recebido</p>
                <p className="text-text-muted text-xs">
                  {currentVote === 'investigar' ? 'Justifica investigacao' : 'Dados inconclusivos'}
                </p>
              </div>
              <span className={`text-accent-teal text-lg ${voting.justVoted ? 'animate-pulse' : ''}`}>✓</span>
            </div>

            {/* Vote counts - always show for users who voted */}
            {isSupabaseConfigured && (
              <VoteResults blurred={false} />
            )}
          </div>
        )}
      </div>

      {/* Educational Takeaway */}
      <div className="bg-bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
          <span>💡</span>
          O Que Aprendemos
        </h3>
        <div className="space-y-3 text-sm text-text-secondary">
          <p>
            <strong className="text-text-primary">1. Dados publicos permitem verificacao:</strong>{' '}
            Qualquer cidadao pode conferir gastos parlamentares no Portal de Dados Abertos da Camara.
          </p>
          <p>
            <strong className="text-text-primary">2. Numeros precisam de contexto:</strong>{' '}
            Um p-value baixo ou concentracao em fornecedor nao sao, por si so, prova de irregularidade.
          </p>
          <p>
            <strong className="text-text-primary">3. Analise honesta reconhece incertezas:</strong>{' '}
            Faltam dados para conclusao definitiva. Transparencia real exigiria acesso a contratos e agendas.
          </p>
        </div>
      </div>
    </div>
  );
}
