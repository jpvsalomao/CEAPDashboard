import { useFavoritesStore } from '../../store/favorites';

interface FavoriteButtonProps {
  deputyId: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FavoriteButton({ deputyId, size = 'md', className = '' }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const favorited = isFavorite(deputyId);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleFavorite(deputyId);
      }}
      className={`transition-all duration-200 ${
        favorited
          ? 'text-accent-amber hover:text-accent-amber/70'
          : 'text-text-muted hover:text-accent-amber'
      } ${className}`}
      title={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
    >
      <svg
        className={sizeClasses[size]}
        fill={favorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
    </button>
  );
}

/**
 * Hook to get favorited deputies data
 */
export function useFavoriteDeputies<T extends { id: number }>(deputies: T[]): T[] {
  const { favoriteIds } = useFavoritesStore();
  return deputies.filter((d) => favoriteIds.includes(d.id));
}
