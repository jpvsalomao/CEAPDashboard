import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { VoteLeaderboard } from '../components/voting/VoteLeaderboard';
import { DeputyVoteCard } from '../components/voting/DeputyVoteCard';
import { SearchModal } from '../components/search/SearchModal';
import { useCurrentMandatoDeputies } from '../hooks/useDeputies';
import { useAuth, useHasVotedThisWeek } from '../hooks/useVoting';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Deputy } from '../types/data';

export function Voting() {
  const [selectedDeputy, setSelectedDeputy] = useState<Deputy | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { data: deputies = [], isLoading } = useCurrentMandatoDeputies();
  const { isAuthenticated, signOut, user } = useAuth();
  const { hasVoted, currentVote, refetch: refetchVoteStatus } = useHasVotedThisWeek();

  const handleSelectDeputy = (deputy: Deputy) => {
    setSelectedDeputy(deputy);
    setIsSearchOpen(false);
  };

  const handleVoteSuccess = () => {
    refetchVoteStatus();
  };

  // Not configured state - show friendly message
  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-6 pt-4">
        <Header
          title="Escolha o Próximo Deep Dive"
          subtitle="Vote no deputado que devemos investigar"
          showSearch={false}
        />

        <div className="glass-card p-8 text-center">
          <p className="text-6xl mb-4">🗳️</p>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Sistema de Votação em Breve
          </h2>
          <p className="text-text-secondary max-w-md mx-auto">
            Estamos finalizando o sistema de votação. Em breve você poderá
            escolher qual deputado deve receber uma investigação aprofundada.
          </p>
          <p className="text-sm text-text-muted mt-4">
            Enquanto isso, explore os dados na aba Visão Geral.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4">
      <Header
        title="Escolha o Próximo Deep Dive"
        subtitle="Vote no deputado que devemos investigar"
        showSearch={false}
      />

      {/* Intro section */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-text-secondary">
              Ajude a decidir qual deputado merece uma investigação detalhada.
              <span className="hidden sm:inline"> Cada pessoa pode votar uma vez por semana.</span>
            </p>
            {hasVoted && currentVote && (
              <p className="text-sm text-accent-teal mt-2">
                Você votou em <span className="font-medium">{currentVote.deputyName}</span> esta semana.
              </p>
            )}
          </div>
          {isAuthenticated && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted hidden sm:inline">
                {user?.email}
              </span>
              <button
                onClick={signOut}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Search and Vote */}
        <div className="space-y-4">
          {/* Search button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full glass-card p-4 flex items-center gap-3 hover:border-accent-teal/50 transition-colors text-left"
          >
            <svg
              className="w-5 h-5 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="text-text-muted">
              Buscar deputado por nome, partido ou estado...
            </span>
          </button>

          {/* Selected deputy or empty state */}
          {selectedDeputy ? (
            <div className="space-y-3">
              <DeputyVoteCard
                deputy={selectedDeputy}
                onVoteSuccess={handleVoteSuccess}
              />
              <button
                onClick={() => setSelectedDeputy(null)}
                className="text-sm text-text-muted hover:text-text-secondary transition-colors"
              >
                Escolher outro deputado
              </button>
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-text-secondary">
                Busque um deputado para ver suas métricas e votar.
              </p>
              <p className="text-sm text-text-muted mt-2">
                Use a busca acima para encontrar por nome, partido ou estado.
              </p>
            </div>
          )}

          {/* Quick picks - Top risk deputies */}
          {!selectedDeputy && !isLoading && deputies.length > 0 && (
            <div className="glass-card p-4">
              <h4 className="text-sm font-medium text-text-primary mb-3">
                Sugestões (maior risco)
              </h4>
              <div className="space-y-2">
                {deputies
                  .filter(d => d.riskLevel === 'CRITICO' || d.riskLevel === 'ALTO')
                  .sort((a, b) => b.riskScore - a.riskScore)
                  .slice(0, 5)
                  .map((deputy) => (
                    <button
                      key={deputy.id}
                      onClick={() => setSelectedDeputy(deputy)}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-bg-secondary hover:bg-bg-primary transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {deputy.name}
                        </p>
                        <p className="text-xs text-text-muted">
                          {deputy.party} - {deputy.uf}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          deputy.riskLevel === 'CRITICO'
                            ? 'bg-accent-red/20 text-accent-red'
                            : 'bg-accent-amber/20 text-accent-amber'
                        }`}
                      >
                        {deputy.riskLevel}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Leaderboard */}
        <div>
          <VoteLeaderboard />
        </div>
      </div>

      {/* How it works */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Como funciona
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 bg-accent-teal/20 text-accent-teal rounded-full flex items-center justify-center font-bold text-sm">
              1
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">Escolha</p>
              <p className="text-xs text-text-muted">
                Busque e selecione um deputado para investigar
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 bg-accent-teal/20 text-accent-teal rounded-full flex items-center justify-center font-bold text-sm">
              2
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">Vote</p>
              <p className="text-xs text-text-muted">
                Entre com Google e registre seu voto
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 bg-accent-teal/20 text-accent-teal rounded-full flex items-center justify-center font-bold text-sm">
              3
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">Acompanhe</p>
              <p className="text-xs text-text-muted">
                O mais votado será investigado a fundo
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectDeputy={handleSelectDeputy}
      />
    </div>
  );
}
