import { Link, useLocation } from 'react-router-dom';

export function NotFound() {
  const location = useLocation();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="relative inline-block">
            <span className="text-[8rem] font-display text-accent-teal/20 leading-none">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-20 h-20 text-accent-teal"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Página não encontrada
        </h1>
        <p className="text-text-secondary mb-6">
          A página <code className="text-accent-amber bg-bg-secondary px-1 rounded">{location.pathname}</code> não existe ou foi movida.
        </p>

        {/* Suggestions */}
        <div className="glass-card p-4 mb-6 text-left">
          <p className="text-sm text-text-muted mb-2">Você pode tentar:</p>
          <ul className="text-sm space-y-1 text-text-secondary">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Verificar se o endereço está correto
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Usar a barra de pesquisa (pressione <kbd className="px-1 bg-bg-card rounded text-xs">/</kbd>)
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Navegar pelo menu lateral
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/"
            className="px-4 py-2 bg-accent-teal text-bg-primary rounded-lg font-medium hover:bg-accent-teal/90 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-teal focus:ring-offset-2 focus:ring-offset-bg-primary"
          >
            Voltar ao início
          </Link>

          <Link
            to="/deputados"
            className="px-4 py-2 bg-bg-secondary text-text-primary rounded-lg font-medium hover:bg-bg-card transition-colors focus:outline-none focus:ring-2 focus:ring-accent-teal focus:ring-offset-2 focus:ring-offset-bg-primary"
          >
            Ver deputados
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-text-muted mb-3">Páginas populares:</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/"
              className="text-sm text-accent-teal hover:underline"
            >
              Visão Geral
            </Link>
            <span className="text-border">•</span>
            <Link
              to="/deputados"
              className="text-sm text-accent-teal hover:underline"
            >
              Deputados
            </Link>
            <span className="text-border">•</span>
            <Link
              to="/analise"
              className="text-sm text-accent-teal hover:underline"
            >
              Análise
            </Link>
            <span className="text-border">•</span>
            <Link
              to="/metodologia"
              className="text-sm text-accent-teal hover:underline"
            >
              Metodologia
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
