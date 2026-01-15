/**
 * SpotlightEmendasPivot - Interactive pivot table for emendas analysis
 *
 * Shows emendas breakdown by:
 * - Municipality (top recipients)
 * - Year (timeline)
 * - Type (beneficiary categories)
 * - State (geographic distribution)
 *
 * Highlights investigation-relevant entities with flags
 */

import { useState } from 'react';

interface MunicipalityData {
  name: string;
  uf: string;
  total: number;
  count: number;
  flag: 'family' | 'investigation' | 'intermediary' | null;
}

interface YearData {
  year: number;
  total: number;
  count: number;
}

interface TypeData {
  type: string;
  total: number;
  count: number;
  highlight?: boolean;
}

interface StateData {
  uf: string;
  total: number;
  count: number;
}

interface PivotSummary {
  total: number;
  recordCount: number;
  uniqueMunicipalities: number;
  uniqueBeneficiaries: number;
  avgPerRecord: number;
}

interface DeputyPivotData {
  summary: PivotSummary;
  byMunicipality: MunicipalityData[];
  byYear: YearData[];
  byState: StateData[];
  byType: TypeData[];
  byModalidade: TypeData[];
}

interface KeyMunicipality {
  name: string;
  elmar: number;
  felix: number;
  flag: string;
  note: string;
}

interface PivotData {
  elmar: DeputyPivotData;
  felix: DeputyPivotData;
  comparison: {
    municipalReach: { elmar: number; felix: number; insight: string };
    avgEmendaSize: { elmar: number; felix: number; insight: string };
    keyMunicipalities: KeyMunicipality[];
  };
}

interface SpotlightEmendasPivotProps {
  pivot: PivotData;
}

type TabType = 'estados' | 'anos' | 'modalidade' | 'tipos';
type DeputyFilter = 'both' | 'elmar' | 'felix';

function formatCurrency(value: number): string {
  // Round to nearest integer first
  const rounded = Math.round(value);
  if (rounded >= 1000000) {
    return `R$ ${(rounded / 1000000).toFixed(1)}M`;
  }
  if (rounded >= 1000) {
    return `R$ ${Math.round(rounded / 1000)}K`;
  }
  return `R$ ${rounded}`;
}

function formatFullCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function getFlagBadge(flag: string | null) {
  if (!flag) return null;

  const badges: Record<string, { icon: string; label: string; color: string }> = {
    family: { icon: '👨‍👩‍👦', label: 'Família', color: 'bg-accent-amber/20 text-accent-amber' },
    investigation: { icon: '🔍', label: 'Investigado', color: 'bg-accent-red/20 text-accent-red' },
    intermediary: { icon: '🏦', label: 'Intermediário', color: 'bg-accent-blue/20 text-accent-blue' },
    electoral_base: { icon: '🗳️', label: 'Base Eleitoral', color: 'bg-accent-teal/20 text-accent-teal' },
  };

  const badge = badges[flag];
  if (!badge) return null;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${badge.color}`}>
      <span>{badge.icon}</span>
      <span>{badge.label}</span>
    </span>
  );
}

export function SpotlightEmendasPivot({ pivot }: SpotlightEmendasPivotProps) {
  const [activeTab, setActiveTab] = useState<TabType>('estados');
  const [deputyFilter, setDeputyFilter] = useState<DeputyFilter>('both');

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'estados', label: 'Estados e Municípios', icon: '🗺️' },
    { id: 'anos', label: 'Por Ano', icon: '📅' },
    { id: 'modalidade', label: 'PIX vs Convênio', icon: '⚡' },
    { id: 'tipos', label: 'Beneficiários', icon: '📊' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-text-primary mb-2">
          Raio-X das Emendas
        </h3>
        <p className="text-sm text-text-muted">
          Explore para onde foi o dinheiro: municípios, anos e tipos de beneficiários
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-bg-secondary rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-accent-amber">
            {formatCurrency(pivot.elmar.summary.total)}
          </p>
          <p className="text-xs text-text-muted mt-1">Elmar Total</p>
        </div>
        <div className="bg-bg-secondary rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-accent-teal">
            {formatCurrency(pivot.felix.summary.total)}
          </p>
          <p className="text-xs text-text-muted mt-1">Félix Total</p>
        </div>
        <div className="bg-bg-secondary rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">
            {pivot.elmar.summary.uniqueMunicipalities + pivot.felix.summary.uniqueMunicipalities}
          </p>
          <p className="text-xs text-text-muted mt-1">Municípios Atendidos</p>
        </div>
        <div className="bg-bg-secondary rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">
            {formatCurrency(pivot.elmar.summary.total + pivot.felix.summary.total)}
          </p>
          <p className="text-xs text-text-muted mt-1">Total Combinado</p>
        </div>
      </div>

      {/* Key Municipalities Highlight */}
      <div className="bg-accent-red/5 border border-accent-red/20 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <span>🎯</span>
          Municípios-Chave na Investigação
        </h4>
        <div className="space-y-2">
          {pivot.comparison.keyMunicipalities.map((muni) => (
            <div
              key={muni.name}
              className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-text-primary text-sm">{muni.name}</span>
                {getFlagBadge(muni.flag)}
              </div>
              <div className="flex items-center gap-4 text-xs">
                {muni.elmar > 0 && (
                  <span className="text-accent-amber">
                    Elmar: {formatCurrency(muni.elmar)}
                  </span>
                )}
                {muni.felix > 0 && (
                  <span className="text-accent-teal">
                    Félix: {formatCurrency(muni.felix)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-3 italic">
          * Brasília representa o Banco do Brasil como intermediário financeiro
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 justify-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-accent-teal text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-primary'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Deputy Filter */}
      <div className="flex justify-center gap-2">
        {(['both', 'elmar', 'felix'] as DeputyFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => setDeputyFilter(filter)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              deputyFilter === filter
                ? 'bg-bg-card text-text-primary border border-border'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {filter === 'both' ? 'Ambos' : filter === 'elmar' ? 'Elmar' : 'Félix'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-bg-secondary rounded-lg p-4 overflow-x-auto">
        {activeTab === 'estados' && (
          <EstadosTable
            elmarData={pivot.elmar.byState}
            felixData={pivot.felix.byState}
            elmarMunicipios={pivot.elmar.byMunicipality}
            felixMunicipios={pivot.felix.byMunicipality}
            filter={deputyFilter}
          />
        )}
        {activeTab === 'anos' && (
          <AnosTable
            elmarData={pivot.elmar.byYear}
            felixData={pivot.felix.byYear}
            filter={deputyFilter}
          />
        )}
        {activeTab === 'modalidade' && (
          <ModalidadeTable
            elmarData={pivot.elmar.byModalidade}
            felixData={pivot.felix.byModalidade}
            filter={deputyFilter}
          />
        )}
        {activeTab === 'tipos' && (
          <TiposTable
            elmarData={pivot.elmar.byType}
            felixData={pivot.felix.byType}
            filter={deputyFilter}
          />
        )}
      </div>
    </div>
  );
}

// Sub-components for each tab
function AnosTable({
  elmarData,
  felixData,
  filter
}: {
  elmarData: YearData[];
  felixData: YearData[];
  filter: DeputyFilter;
}) {
  const showElmar = filter === 'both' || filter === 'elmar';
  const showFelix = filter === 'both' || filter === 'felix';

  // Get all years
  const allYears = new Set([
    ...elmarData.map(d => d.year),
    ...felixData.map(d => d.year)
  ]);

  const rows = Array.from(allYears)
    .sort()
    .map(year => {
      const elmar = elmarData.find(d => d.year === year);
      const felix = felixData.find(d => d.year === year);
      return {
        year,
        elmar: elmar?.total || 0,
        felix: felix?.total || 0,
        total: (elmar?.total || 0) + (felix?.total || 0)
      };
    });

  // Calculate max for bar width
  const maxTotal = Math.max(...rows.map(r => r.total));

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.year} className="flex items-center gap-3">
          <span className="w-12 text-sm font-medium text-text-primary">{row.year}</span>
          <div className="flex-1 flex gap-1">
            {showElmar && (
              <div
                className="bg-accent-amber/60 h-6 rounded-l"
                style={{ width: `${(row.elmar / maxTotal) * 100}%` }}
                title={`Elmar: ${formatFullCurrency(row.elmar)}`}
              />
            )}
            {showFelix && (
              <div
                className="bg-accent-teal/60 h-6 rounded-r"
                style={{ width: `${(row.felix / maxTotal) * 100}%` }}
                title={`Félix: ${formatFullCurrency(row.felix)}`}
              />
            )}
          </div>
          <span className="w-20 text-right text-sm text-text-muted">
            {formatCurrency(filter === 'elmar' ? row.elmar : filter === 'felix' ? row.felix : row.total)}
          </span>
        </div>
      ))}
      <div className="flex justify-center gap-4 mt-4 text-xs text-text-muted">
        {showElmar && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-accent-amber/60 rounded" />
            Elmar
          </span>
        )}
        {showFelix && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-accent-teal/60 rounded" />
            Félix
          </span>
        )}
      </div>
    </div>
  );
}

function ModalidadeTable({
  elmarData,
  felixData,
  filter
}: {
  elmarData: TypeData[];
  felixData: TypeData[];
  filter: DeputyFilter;
}) {
  const showElmar = filter === 'both' || filter === 'elmar';
  const showFelix = filter === 'both' || filter === 'felix';

  // Combine modalidades
  const combined = new Map<string, { elmar: number; felix: number; highlight: boolean }>();

  if (showElmar && elmarData) {
    elmarData.forEach(t => {
      combined.set(t.type, {
        elmar: t.total,
        felix: combined.get(t.type)?.felix || 0,
        highlight: t.highlight || false
      });
    });
  }

  if (showFelix && felixData) {
    felixData.forEach(t => {
      const existing = combined.get(t.type);
      combined.set(t.type, {
        elmar: existing?.elmar || 0,
        felix: t.total,
        highlight: existing?.highlight || t.highlight || false
      });
    });
  }

  const sorted = Array.from(combined.entries())
    .map(([type, data]) => ({ type, ...data, total: data.elmar + data.felix }))
    .sort((a, b) => b.total - a.total);

  // Calculate percentages
  const elmarTotal = elmarData?.reduce((sum, t) => sum + t.total, 0) || 0;
  const felixTotal = felixData?.reduce((sum, t) => sum + t.total, 0) || 0;
  const grandTotal = elmarTotal + felixTotal;

  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-muted border-b border-border-subtle">
            <th className="pb-2 font-medium">Modalidade</th>
            {showElmar && <th className="pb-2 font-medium text-right text-accent-amber">Elmar</th>}
            {showElmar && <th className="pb-2 font-medium text-right text-accent-amber">%</th>}
            {showFelix && <th className="pb-2 font-medium text-right text-accent-teal">Félix</th>}
            {showFelix && <th className="pb-2 font-medium text-right text-accent-teal">%</th>}
            {filter === 'both' && <th className="pb-2 font-medium text-right">Total</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.type}
              className={`border-b border-border-subtle/50 last:border-0 ${row.highlight ? 'bg-accent-amber/5' : ''}`}
            >
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <span className={`text-text-primary ${row.highlight ? 'font-semibold' : ''}`}>
                    {row.type}
                  </span>
                  {row.highlight && (
                    <span className="px-2 py-0.5 bg-accent-amber/20 text-accent-amber text-xs rounded">
                      Menor controle
                    </span>
                  )}
                </div>
              </td>
              {showElmar && (
                <>
                  <td className="py-3 text-right text-accent-amber font-medium">
                    {row.elmar > 0 ? formatCurrency(row.elmar) : '-'}
                  </td>
                  <td className="py-3 text-right text-accent-amber/70 text-xs">
                    {row.elmar > 0 && elmarTotal > 0 ? `${((row.elmar / elmarTotal) * 100).toFixed(1)}%` : ''}
                  </td>
                </>
              )}
              {showFelix && (
                <>
                  <td className="py-3 text-right text-accent-teal font-medium">
                    {row.felix > 0 ? formatCurrency(row.felix) : '-'}
                  </td>
                  <td className="py-3 text-right text-accent-teal/70 text-xs">
                    {row.felix > 0 && felixTotal > 0 ? `${((row.felix / felixTotal) * 100).toFixed(1)}%` : ''}
                  </td>
                </>
              )}
              {filter === 'both' && (
                <td className="py-3 text-right font-semibold text-text-primary">
                  {formatCurrency(row.total)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border font-semibold">
            <td className="pt-3 text-text-primary">Total</td>
            {showElmar && (
              <>
                <td className="pt-3 text-right text-accent-amber">{formatCurrency(elmarTotal)}</td>
                <td className="pt-3 text-right text-accent-amber/70 text-xs">100%</td>
              </>
            )}
            {showFelix && (
              <>
                <td className="pt-3 text-right text-accent-teal">{formatCurrency(felixTotal)}</td>
                <td className="pt-3 text-right text-accent-teal/70 text-xs">100%</td>
              </>
            )}
            {filter === 'both' && (
              <td className="pt-3 text-right text-text-primary">{formatCurrency(grandTotal)}</td>
            )}
          </tr>
        </tfoot>
      </table>
      <p className="text-xs text-text-muted text-center">
        * Emendas PIX (Transferências Especiais) vão direto para prefeituras sem necessidade de convênio
      </p>
    </div>
  );
}

function TiposTable({
  elmarData,
  felixData,
  filter
}: {
  elmarData: TypeData[];
  felixData: TypeData[];
  filter: DeputyFilter;
}) {
  const showElmar = filter === 'both' || filter === 'elmar';
  const showFelix = filter === 'both' || filter === 'felix';

  // Combine types
  const combined = new Map<string, { elmar: number; felix: number }>();

  if (showElmar) {
    elmarData.forEach(t => {
      combined.set(t.type, { elmar: t.total, felix: combined.get(t.type)?.felix || 0 });
    });
  }

  if (showFelix) {
    felixData.forEach(t => {
      const existing = combined.get(t.type);
      combined.set(t.type, { elmar: existing?.elmar || 0, felix: t.total });
    });
  }

  const sorted = Array.from(combined.entries())
    .map(([type, data]) => ({ type, ...data, total: data.elmar + data.felix }))
    .sort((a, b) => b.total - a.total);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-text-muted border-b border-border-subtle">
          <th className="pb-2 font-medium">Tipo de Beneficiário</th>
          {showElmar && <th className="pb-2 font-medium text-right text-accent-amber">Elmar</th>}
          {showFelix && <th className="pb-2 font-medium text-right text-accent-teal">Félix</th>}
          {filter === 'both' && <th className="pb-2 font-medium text-right">Total</th>}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => (
          <tr key={row.type} className="border-b border-border-subtle/50 last:border-0">
            <td className="py-2 text-text-primary">{row.type}</td>
            {showElmar && (
              <td className="py-2 text-right text-accent-amber">
                {row.elmar > 0 ? formatCurrency(row.elmar) : '-'}
              </td>
            )}
            {showFelix && (
              <td className="py-2 text-right text-accent-teal">
                {row.felix > 0 ? formatCurrency(row.felix) : '-'}
              </td>
            )}
            {filter === 'both' && (
              <td className="py-2 text-right font-medium text-text-primary">
                {formatCurrency(row.total)}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EstadosTable({
  elmarData,
  felixData,
  elmarMunicipios,
  felixMunicipios,
  filter
}: {
  elmarData: StateData[];
  felixData: StateData[];
  elmarMunicipios: MunicipalityData[];
  felixMunicipios: MunicipalityData[];
  filter: DeputyFilter;
}) {
  const showElmar = filter === 'both' || filter === 'elmar';
  const showFelix = filter === 'both' || filter === 'felix';
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());

  const toggleState = (uf: string) => {
    setExpandedStates(prev => {
      const next = new Set(prev);
      if (next.has(uf)) {
        next.delete(uf);
      } else {
        next.add(uf);
      }
      return next;
    });
  };

  // Combine states
  const combined = new Map<string, { elmar: number; felix: number }>();

  if (showElmar) {
    elmarData.forEach(s => {
      combined.set(s.uf, { elmar: s.total, felix: combined.get(s.uf)?.felix || 0 });
    });
  }

  if (showFelix) {
    felixData.forEach(s => {
      const existing = combined.get(s.uf);
      combined.set(s.uf, { elmar: existing?.elmar || 0, felix: s.total });
    });
  }

  const sorted = Array.from(combined.entries())
    .map(([uf, data]) => ({ uf, ...data, total: data.elmar + data.felix }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Get municipalities for a state
  const getMunicipiosForState = (uf: string) => {
    const municipios = new Map<string, { name: string; elmar: number; felix: number; flag: string | null }>();

    if (showElmar) {
      elmarMunicipios
        .filter(m => m.uf === uf)
        .forEach(m => {
          municipios.set(m.name, {
            name: m.name,
            elmar: m.total,
            felix: municipios.get(m.name)?.felix || 0,
            flag: m.flag
          });
        });
    }

    if (showFelix) {
      felixMunicipios
        .filter(m => m.uf === uf)
        .forEach(m => {
          const existing = municipios.get(m.name);
          municipios.set(m.name, {
            name: m.name,
            elmar: existing?.elmar || 0,
            felix: m.total,
            flag: existing?.flag || m.flag
          });
        });
    }

    return Array.from(municipios.values())
      .map(m => ({ ...m, total: m.elmar + m.felix }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  };

  return (
    <div className="space-y-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-muted border-b border-border-subtle">
            <th className="pb-2 font-medium">Estado / Município</th>
            {showElmar && <th className="pb-2 font-medium text-right text-accent-amber">Elmar</th>}
            {showFelix && <th className="pb-2 font-medium text-right text-accent-teal">Félix</th>}
            {filter === 'both' && <th className="pb-2 font-medium text-right">Total</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const isExpanded = expandedStates.has(row.uf);
            const municipios = isExpanded ? getMunicipiosForState(row.uf) : [];

            return (
              <>
                <tr
                  key={row.uf}
                  className="border-b border-border-subtle/50 cursor-pointer hover:bg-bg-card/50 transition-colors"
                  onClick={() => toggleState(row.uf)}
                >
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted text-xs w-4">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <span className="text-text-primary font-semibold">{row.uf}</span>
                    </div>
                  </td>
                  {showElmar && (
                    <td className="py-2 text-right text-accent-amber font-medium">
                      {row.elmar > 0 ? formatCurrency(row.elmar) : '-'}
                    </td>
                  )}
                  {showFelix && (
                    <td className="py-2 text-right text-accent-teal font-medium">
                      {row.felix > 0 ? formatCurrency(row.felix) : '-'}
                    </td>
                  )}
                  {filter === 'both' && (
                    <td className="py-2 text-right font-semibold text-text-primary">
                      {formatCurrency(row.total)}
                    </td>
                  )}
                </tr>
                {isExpanded && municipios.map((muni) => (
                  <tr
                    key={`${row.uf}-${muni.name}`}
                    className="bg-bg-card/30 border-b border-border-subtle/30"
                  >
                    <td className="py-1.5 pl-8">
                      <div className="flex items-center gap-2">
                        <span className="text-text-secondary text-xs">{muni.name}</span>
                        {getFlagBadge(muni.flag)}
                      </div>
                    </td>
                    {showElmar && (
                      <td className="py-1.5 text-right text-accent-amber/70 text-xs">
                        {muni.elmar > 0 ? formatCurrency(muni.elmar) : '-'}
                      </td>
                    )}
                    {showFelix && (
                      <td className="py-1.5 text-right text-accent-teal/70 text-xs">
                        {muni.felix > 0 ? formatCurrency(muni.felix) : '-'}
                      </td>
                    )}
                    {filter === 'both' && (
                      <td className="py-1.5 text-right text-text-muted text-xs">
                        {formatCurrency(muni.total)}
                      </td>
                    )}
                  </tr>
                ))}
              </>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs text-text-muted text-center pt-2">
        Clique em um estado para ver os municípios
      </p>
    </div>
  );
}
