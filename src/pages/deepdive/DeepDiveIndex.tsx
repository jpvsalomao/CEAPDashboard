/**
 * DeepDive Index View
 * Shows list of all available deep dives organized by category
 */

import { Link } from 'react-router-dom';
import { DEEP_DIVE_CONTENT, CATEGORY_LABELS, getDeepDivesByCategory } from './DeepDiveContent';

export function DeepDiveIndex() {
  const deepDivesByCategory = getDeepDivesByCategory();

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="border-b border-border pb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-accent-teal/20 flex items-center justify-center text-2xl">
            🔎
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Deep Dives</h1>
            <p className="text-lg text-text-secondary mt-1">
              Analises aprofundadas de casos especificos e padroes identificados nos dados
            </p>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-bg-secondary rounded-lg p-4">
          <p className="text-2xl font-bold text-accent-teal">
            {Object.keys(DEEP_DIVE_CONTENT).length}
          </p>
          <p className="text-sm text-text-muted">Deep Dives Disponiveis</p>
        </div>
        <div className="bg-bg-secondary rounded-lg p-4">
          <p className="text-2xl font-bold text-accent-blue">
            {deepDivesByCategory['case-study'].length}
          </p>
          <p className="text-sm text-text-muted">Estudos de Caso</p>
        </div>
        <div className="bg-bg-secondary rounded-lg p-4">
          <p className="text-2xl font-bold text-accent-amber">
            {deepDivesByCategory.analysis.length}
          </p>
          <p className="text-sm text-text-muted">Analises Sistematicas</p>
        </div>
        <div className="bg-bg-secondary rounded-lg p-4">
          <p className="text-2xl font-bold text-text-primary">
            {Object.values(DEEP_DIVE_CONTENT).filter(d => d.dataAvailable).length}
          </p>
          <p className="text-sm text-text-muted">Com Dados Reais</p>
        </div>
      </div>

      {/* Deep Dives by Category */}
      {(['case-study', 'analysis', 'methodology'] as const).map(category => {
        const items = deepDivesByCategory[category];
        if (items.length === 0) return null;
        const { title, icon } = CATEGORY_LABELS[category];

        return (
          <section key={category}>
            <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
              <span>{icon}</span>
              {title}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map(item => (
                <Link
                  key={item.slug}
                  to={`/deepdive/${item.slug}`}
                  className="bg-bg-secondary rounded-lg p-5 hover:bg-bg-card transition group relative"
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
          <span className="font-medium text-text-secondary">Nota:</span> Os deep dives utilizam
          dados publicos do Portal de Dados Abertos da Camara dos Deputados. Os padroes
          identificados nao constituem prova de irregularidades.
        </p>
      </aside>
    </div>
  );
}
