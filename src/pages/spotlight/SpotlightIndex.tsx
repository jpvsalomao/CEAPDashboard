/**
 * Spotlight Index View
 * Shows list of all available spotlights (Destaques)
 */

import { Link } from 'react-router-dom';
import { SPOTLIGHT_CONTENT } from './SpotlightContent';
import { useSpotlightVoteCounts } from '../../hooks/useSpotlightVoting';
import { isSupabaseConfigured } from '../../lib/supabase';

// Format "2026-01" to "Jan 2026"
function formatAddedDate(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

// Vote count badge component for debate spotlights
function VoteCountBadge({ slug }: { slug: string }) {
  const { counts, loading } = useSpotlightVoteCounts(slug);

  if (!isSupabaseConfigured || loading) {
    return (
      <span className="px-2 py-0.5 bg-accent-amber/10 text-accent-amber rounded flex items-center gap-1">
        <span>🗳️</span> Vote
      </span>
    );
  }

  if (counts.total === 0) {
    return (
      <span className="px-2 py-0.5 bg-accent-amber/10 text-accent-amber rounded flex items-center gap-1">
        <span>🗳️</span> Vote
      </span>
    );
  }

  // Calculate percentages
  const investigarPct = Math.round((counts.investigar / counts.total) * 100);

  return (
    <span className="px-2 py-1 bg-bg-card rounded flex items-center gap-2 text-xs">
      <span className="text-text-muted">{counts.total} {counts.total === 1 ? 'voto' : 'votos'}</span>
      <span className="text-text-muted">•</span>
      <span className="text-accent-amber font-medium">{investigarPct}% investigar</span>
    </span>
  );
}

export function SpotlightIndex() {
  const allSpotlights = Object.values(SPOTLIGHT_CONTENT);

  return (
    <div className="space-y-8 pt-4">
      {/* Header */}
      <header className="border-b border-border pb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-accent-teal/20 flex items-center justify-center text-2xl">
            🔦
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Destaques</h1>
            <p className="text-lg text-text-secondary mt-1">
              Análises aprofundadas de casos específicos e padrões identificados nos dados
            </p>
          </div>
        </div>
      </header>

      {/* Intro text */}
      <div className="bg-bg-secondary rounded-lg p-5 border-l-4 border-accent-amber">
        <p className="text-text-secondary">
          Análises especiais motivadas por notícias e eventos recentes.
          Cada caso combina dados públicos com contexto jornalístico.
        </p>
      </div>

      {/* All Spotlights - Flat grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allSpotlights.map(item => (
          <Link
            key={item.slug}
            to={`/spotlight/${item.slug}`}
            className={`rounded-lg p-5 hover:bg-bg-card transition group relative ${
              item.category === 'debate'
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
            <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
              <div className="flex items-center gap-2">
                {item.deputyId && item.category !== 'debate' && (
                  <span className="px-2 py-0.5 bg-bg-card rounded">Deputado</span>
                )}
                {item.category === 'debate' && (
                  <VoteCountBadge slug={item.slug} />
                )}
                {item.relatedSlugs.length > 0 && (
                  <span className="px-2 py-0.5 bg-bg-card rounded">
                    {item.relatedSlugs.length} relacionados
                  </span>
                )}
              </div>
              <span className="text-text-muted">{formatAddedDate(item.addedDate)}</span>
            </div>
          </Link>
        ))}
      </div>

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
