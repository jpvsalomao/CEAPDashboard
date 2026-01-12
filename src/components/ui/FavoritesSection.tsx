import { Link } from 'react-router-dom';
import { useFavoritesStore } from '../../store/favorites';
import { useDeputies } from '../../hooks/useDeputies';
import { FavoriteButton } from './FavoriteButton';
import { formatReais, abbreviateName, getRiskColor } from '../../utils/formatters';

interface FavoritesSectionProps {
  maxItems?: number;
  showEmpty?: boolean;
}

export function FavoritesSection({ maxItems = 5, showEmpty = true }: FavoritesSectionProps) {
  const { favoriteIds, clearFavorites } = useFavoritesStore();
  const { data: deputies } = useDeputies();

  if (!deputies) return null;

  const favoriteDeputies = deputies.filter((d) => favoriteIds.includes(d.id));

  if (favoriteDeputies.length === 0) {
    if (!showEmpty) return null;
    return (
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-text-secondary mb-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-accent-amber" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          Favoritos
        </h3>
        <p className="text-xs text-text-muted">
          Nenhum deputado favorito. Clique na estrela ao lado de um deputado para adicionar.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
          <svg className="w-4 h-4 text-accent-amber" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          Favoritos ({favoriteDeputies.length})
        </h3>
        {favoriteDeputies.length > 0 && (
          <button
            onClick={clearFavorites}
            className="text-xs text-text-muted hover:text-accent-red transition-colors"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="space-y-2">
        {favoriteDeputies.slice(0, maxItems).map((deputy) => (
          <div
            key={deputy.id}
            className="flex items-center justify-between p-2 bg-bg-secondary rounded-lg hover:bg-bg-card transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FavoriteButton deputyId={deputy.id} size="sm" />
              <Link
                to={`/deputado/${deputy.id}`}
                className="truncate text-sm text-text-primary hover:text-accent-teal transition-colors"
              >
                {abbreviateName(deputy.name)}
              </Link>
              <span className={`text-xs ${getRiskColor(deputy.riskLevel)}`}>
                {deputy.riskLevel}
              </span>
            </div>
            <span className="text-xs font-mono text-text-muted ml-2 whitespace-nowrap">
              {formatReais(deputy.totalSpending, true)}
            </span>
          </div>
        ))}
      </div>

      {favoriteDeputies.length > maxItems && (
        <Link
          to="/deputados"
          className="block mt-2 text-xs text-accent-teal hover:underline text-center"
        >
          Ver todos ({favoriteDeputies.length})
        </Link>
      )}
    </div>
  );
}
