/**
 * Spotlight Index View
 * Shows list of all available spotlights organized by category
 */

import { Link } from 'react-router-dom';
import { CATEGORY_LABELS, getSpotlightsByCategory } from './SpotlightContent';

export function SpotlightIndex() {
  const spotlightsByCategory = getSpotlightsByCategory();

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="border-b border-border pb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-accent-teal/20 flex items-center justify-center text-2xl">
            🔦
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Spotlight</h1>
            <p className="text-lg text-text-secondary mt-1">
              Análises aprofundadas de casos específicos e padrões identificados nos dados
            </p>
          </div>
        </div>
      </header>

      {/* Intro text - simple for single case */}
      <div className="bg-bg-secondary rounded-lg p-5 border-l-4 border-accent-amber">
        <p className="text-text-secondary">
          Análises especiais motivadas por notícias e eventos recentes.
          Cada caso combina dados públicos com contexto jornalístico.
        </p>
      </div>

      {/* Spotlights by Category - Debates first */}
      {(['debate', 'case-study', 'analysis', 'methodology'] as const).map(category => {
        const items = spotlightsByCategory[category];
        if (items.length === 0) return null;
        const { title, icon } = CATEGORY_LABELS[category];

        return (
          <section key={category}>
            <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
              <span>{icon}</span>
              {title}
              {category === 'debate' && (
                <span className="px-2 py-0.5 bg-accent-amber/20 text-accent-amber text-xs rounded-full ml-2">
                  Novo
                </span>
              )}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map(item => (
                <Link
                  key={item.slug}
                  to={`/spotlight/${item.slug}`}
                  className={`rounded-lg p-5 hover:bg-bg-card transition group relative ${
                    category === 'debate'
                      ? 'bg-accent-amber/5 border border-accent-amber/20 hover:border-accent-amber/40'
                      : 'bg-bg-secondary'
                  }`}
                >
                  {!item.dataAvailable && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 bg-accent-amber/20 text-accent-amber text-xs rounded-full">
                      Em breve
                    </span>
                  )}
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text-primary group-hover:text-accent-teal transition truncate">
                        {item.title}
                      </h3>
                      <p className="text-sm text-text-muted mt-0.5">{item.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary mt-3 line-clamp-2">
                    {item.summary.slice(0, 120)}...
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
                    {item.deputyId && (
                      <span className="px-2 py-0.5 bg-bg-card rounded">Deputado</span>
                    )}
                    {category === 'debate' && (
                      <span className="px-2 py-0.5 bg-accent-amber/10 text-accent-amber rounded">
                        Vote
                      </span>
                    )}
                    {item.relatedSlugs.length > 0 && (
                      <span className="px-2 py-0.5 bg-bg-card rounded">
                        {item.relatedSlugs.length} relacionados
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {/* Disclaimer */}
      <aside className="bg-bg-card border border-border rounded-lg p-4 text-sm">
        <p className="text-text-muted">
          <span className="font-medium text-text-secondary">Nota:</span> Os spotlights utilizam
          dados públicos do Portal de Dados Abertos da Câmara dos Deputados. Os padrões
          identificados não constituem prova de irregularidades.
        </p>
      </aside>
    </div>
  );
}
