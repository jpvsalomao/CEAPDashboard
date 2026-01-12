import { useVoteLeaderboard } from '../../hooks/useVoting';
import { isSupabaseConfigured } from '../../lib/supabase';

export function VoteLeaderboard() {
  const { leaderboard, loading, error } = useVoteLeaderboard();

  if (!isSupabaseConfigured) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Ranking de Votos
        </h3>
        <p className="text-sm text-text-muted">
          Sistema de votação em configuração...
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Ranking de Votos
        </h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-8 h-8 bg-bg-secondary rounded-full" />
              <div className="flex-1 h-4 bg-bg-secondary rounded" />
              <div className="w-12 h-4 bg-bg-secondary rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Ranking de Votos
        </h3>
        <p className="text-sm text-accent-red">
          Erro ao carregar ranking. Tente novamente.
        </p>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Ranking de Votos
        </h3>
        <div className="text-center py-8">
          <p className="text-4xl mb-3">🗳️</p>
          <p className="text-text-secondary">
            Seja o primeiro a votar!
          </p>
          <p className="text-sm text-text-muted mt-1">
            Escolha qual deputado devemos investigar a fundo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">
          Ranking de Votos
        </h3>
        <span className="text-xs text-text-muted bg-bg-secondary px-2 py-1 rounded">
          Atualizado em tempo real
        </span>
      </div>

      <div className="space-y-2">
        {leaderboard.slice(0, 10).map((entry, index) => (
          <div
            key={entry.deputy_id}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              index === 0
                ? 'bg-accent-teal/10 border border-accent-teal/30'
                : 'bg-bg-secondary hover:bg-bg-secondary/80'
            }`}
          >
            {/* Rank */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                index === 0
                  ? 'bg-accent-teal text-bg-primary'
                  : index === 1
                  ? 'bg-text-muted text-bg-primary'
                  : index === 2
                  ? 'bg-accent-amber text-bg-primary'
                  : 'bg-bg-primary text-text-secondary'
              }`}
            >
              {index + 1}
            </div>

            {/* Deputy name */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {entry.deputy_name}
              </p>
            </div>

            {/* Vote count */}
            <div className="text-right">
              <span className="text-sm font-semibold text-accent-teal">
                {entry.vote_count}
              </span>
              <span className="text-xs text-text-muted ml-1">
                {entry.vote_count === 1 ? 'voto' : 'votos'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {leaderboard.length > 10 && (
        <p className="text-xs text-text-muted text-center mt-4">
          +{leaderboard.length - 10} deputados com votos
        </p>
      )}
    </div>
  );
}
