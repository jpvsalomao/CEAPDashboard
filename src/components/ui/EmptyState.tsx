interface EmptyStateProps {
  icon?: 'search' | 'filter' | 'chart' | 'network' | 'error';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const icons = {
  search: (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  filter: (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  ),
  chart: (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  network: (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
      />
    </svg>
  ),
  error: (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
};

export function EmptyState({
  icon = 'search',
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-text-muted mb-4 opacity-50">{icons[icon]}</div>
      <h3 className="text-lg font-medium text-text-primary mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-md mb-6">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-accent-teal text-bg-primary rounded-lg font-medium text-sm hover:bg-accent-teal/90 hover:shadow-lg hover:shadow-accent-teal/20 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-accent-teal focus:ring-offset-2 focus:ring-offset-bg-primary transition-all duration-200"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

interface NoResultsProps {
  query?: string;
  filterCount?: number;
  onClearFilters?: () => void;
}

export function NoResults({ query, filterCount = 0, onClearFilters }: NoResultsProps) {
  if (query) {
    return (
      <EmptyState
        icon="search"
        title={`Nenhum resultado para "${query}"`}
        description="Tente buscar por outro nome, partido ou estado."
      />
    );
  }

  if (filterCount > 0) {
    return (
      <EmptyState
        icon="filter"
        title="Nenhum deputado encontrado"
        description={`Os ${filterCount} filtros aplicados não retornaram resultados. Tente remover alguns filtros.`}
        action={
          onClearFilters
            ? { label: 'Limpar filtros', onClick: onClearFilters }
            : undefined
        }
      />
    );
  }

  return (
    <EmptyState
      icon="chart"
      title="Sem dados disponíveis"
      description="Os dados ainda não foram carregados ou não existem para a seleção atual."
    />
  );
}

export function NetworkEmpty() {
  return (
    <EmptyState
      icon="network"
      title="Rede vazia"
      description="Nenhuma conexão encontrada com os filtros atuais. Tente diminuir a concentração mínima ou aumentar o número de deputados."
    />
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <EmptyState
      icon="error"
      title="Erro ao carregar dados"
      description={message || "Verifique se os arquivos JSON foram gerados em /public/data/"}
    />
  );
}
