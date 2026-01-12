import { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { Deputy } from '../../types/data';
import { formatReais, formatNumber } from '../../utils/formatters';
import { getRiskLevelColor } from '../../utils/colors';
import { FEATURES } from '../../config/features';

// ============================================================================
// Metric Definitions & Explanations
// ============================================================================

interface MetricDefinition {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  normalRange: string;
  suspiciousThreshold: string;
  interpretation: string;
}

const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  totalSpending: {
    id: 'totalSpending',
    label: 'Gasto Total',
    shortLabel: 'Gasto',
    description: 'Valor total reembolsado via CEAP no período analisado.',
    normalRange: 'R$ 500k - R$ 1.5M',
    suspiciousThreshold: 'Z-score > 2.5 (muito acima da média)',
    interpretation: 'Gastos extremamente altos podem indicar uso intensivo ou abusivo da cota.',
  },
  hhi: {
    id: 'hhi',
    label: 'HHI (Concentração)',
    shortLabel: 'HHI',
    description: 'Índice Herfindahl-Hirschman: mede concentração de fornecedores. Varia de 0 a 10.000.',
    normalRange: '< 1.500 (diversificado)',
    suspiciousThreshold: '> 2.500 (muito concentrado)',
    interpretation: 'HHI alto indica dependência de poucos fornecedores — possível relacionamento privilegiado.',
  },
  benfordChi2: {
    id: 'benfordChi2',
    label: 'Benford χ²',
    shortLabel: 'Benford',
    description: 'Teste estatístico que verifica se os primeiros dígitos dos valores seguem a Lei de Benford.',
    normalRange: '< 15.5 (distribuição natural)',
    suspiciousThreshold: '> 20.1 (p < 0.01, significativo)',
    interpretation: 'Desvio da Lei de Benford pode indicar valores manipulados ou arredondados artificialmente.',
  },
  roundValuePct: {
    id: 'roundValuePct',
    label: '% Valores Redondos',
    shortLabel: '% Redondos',
    description: 'Percentual de transações com valores terminados em 00, 50, ou múltiplos de 100.',
    normalRange: '< 15%',
    suspiciousThreshold: '> 25%',
    interpretation: 'Excesso de valores redondos sugere estimativas ou valores combinados, não despesas reais.',
  },
  topSupplierPct: {
    id: 'topSupplierPct',
    label: 'Top Fornecedor %',
    shortLabel: 'Top Forn.',
    description: 'Percentual do gasto total concentrado no maior fornecedor.',
    normalRange: '< 30%',
    suspiciousThreshold: '> 50% (muito concentrado)',
    interpretation: 'Alta dependência de um único fornecedor pode indicar relacionamento comercial privilegiado.',
  },
  zScoreParty: {
    id: 'zScoreParty',
    label: 'Z-Score vs Partido',
    shortLabel: 'Z Partido',
    description: 'Desvios-padrão acima/abaixo da média de gastos do partido.',
    normalRange: '-2 a +2 (normal)',
    suspiciousThreshold: '> 2 ou < -2',
    interpretation: 'Gasta muito mais ou muito menos que colegas do mesmo partido.',
  },
  zScoreState: {
    id: 'zScoreState',
    label: 'Z-Score vs Estado',
    shortLabel: 'Z Estado',
    description: 'Desvios-padrão acima/abaixo da média de gastos do estado.',
    normalRange: '-2 a +2 (normal)',
    suspiciousThreshold: '> 2 ou < -2',
    interpretation: 'Gasta muito mais ou muito menos que deputados do mesmo estado.',
  },
  riskScore: {
    id: 'riskScore',
    label: 'Score de Risco',
    shortLabel: 'Risco',
    description: 'Pontuação composta (0-1) combinando todos os indicadores de risco.',
    normalRange: '< 0.3 (baixo)',
    suspiciousThreshold: '> 0.6 (alto) ou > 0.8 (crítico)',
    interpretation: 'Score alto combina múltiplos sinais — merece investigação aprofundada.',
  },
};

// ============================================================================
// Types
// ============================================================================

interface StatisticalInsightsProps {
  deputies: Deputy[];
}

interface EnrichedDeputy extends Deputy {
  spendingZScore: number;
  hhiZScore: number;
  benfordZScore: number;
  roundValueZScore: number;
  topSupplierPct: number;
  topSupplierZScore: number;
  flagCount: number;
}

type SortField = 'name' | 'totalSpending' | 'hhi' | 'benfordChi2' | 'roundValuePct' | 'topSupplierPct' | 'zScoreParty' | 'zScoreState' | 'riskScore' | 'flagCount';
type SortDirection = 'asc' | 'desc';

// ============================================================================
// Utility Functions
// ============================================================================

function calculateStats(values: number[]): { mean: number; std: number } {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
  return { mean, std };
}

function calculateZScore(value: number, mean: number, std: number): number {
  return std === 0 ? 0 : (value - mean) / std;
}

function getZScoreColor(z: number): string {
  const absZ = Math.abs(z);
  if (absZ >= 3) return '#DC4A4A'; // Critical - red
  if (absZ >= 2.5) return '#E5A84B'; // High - amber
  if (absZ >= 2) return '#D4A03A'; // Moderate - yellow
  return '';
}

function getZScoreBgClass(z: number): string {
  const absZ = Math.abs(z);
  if (absZ >= 3) return 'bg-accent-red/20';
  if (absZ >= 2.5) return 'bg-accent-amber/20';
  if (absZ >= 2) return 'bg-accent-amber/10';
  return '';
}

// ============================================================================
// Sub-Components
// ============================================================================

function MetricTooltip({ metric, position }: { metric: MetricDefinition; position: { x: number; y: number } }) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState(position);

  useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = position.x;
      let y = position.y;

      // Adjust horizontal position if tooltip goes off-screen
      if (x + rect.width > viewportWidth - 20) {
        x = position.x - rect.width - 20; // Show on left side instead
      }

      // Adjust vertical position if tooltip goes off-screen
      if (y + rect.height > viewportHeight - 20) {
        y = viewportHeight - rect.height - 20;
      }
      if (y < 20) {
        y = 20;
      }

      setAdjustedPos({ x, y });
    }
  }, [position]);

  return createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-[9999] w-72 p-3 bg-bg-primary border border-border rounded-lg shadow-xl text-xs pointer-events-none"
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
    >
      <p className="font-semibold text-text-primary mb-1">{metric.label}</p>
      <p className="text-text-secondary mb-2">{metric.description}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-status-low">Normal:</span>
          <span className="text-text-primary text-right">{metric.normalRange}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-accent-red">Suspeito:</span>
          <span className="text-text-primary text-right">{metric.suspiciousThreshold}</span>
        </div>
      </div>
      <p className="mt-2 text-text-muted italic">{metric.interpretation}</p>
    </div>,
    document.body
  );
}

function SortableHeader({
  label,
  field,
  currentSort,
  currentDirection,
  onSort,
  metric,
  align = 'left',
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
  metric?: MetricDefinition;
  align?: 'left' | 'right' | 'center';
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const isActive = currentSort === field;

  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const flexJustify = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (metric) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPos({ x: rect.left, y: rect.bottom + 8 });
      setShowTooltip(true);
    }
  };

  return (
    <th
      className={`py-2 px-2 text-text-muted font-medium cursor-pointer hover:text-text-primary transition-colors relative ${alignClass}`}
      onClick={() => onSort(field)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={`flex items-center gap-1 ${flexJustify}`}>
        <span className={isActive ? 'text-accent-teal' : ''}>{label}</span>
        {metric && (
          <svg className="w-3 h-3 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {isActive && (
          <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            {currentDirection === 'desc' ? (
              <path d="M7 10l5 5 5-5H7z" />
            ) : (
              <path d="M7 14l5-5 5 5H7z" />
            )}
          </svg>
        )}
      </div>
      {showTooltip && metric && <MetricTooltip metric={metric} position={tooltipPos} />}
    </th>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function StatisticalInsights({ deputies }: StatisticalInsightsProps) {
  const [sortField, setSortField] = useState<SortField>('riskScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [zThreshold, setZThreshold] = useState(2.5);
  const [showOnlyOutliers, setShowOnlyOutliers] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 15;

  // Compute enriched data
  const { enrichedDeputies, descriptiveStats } = useMemo(() => {
    const validDeputies = deputies.filter(
      (d) => d.name && !d.name.includes('LIDERANCA') && d.totalSpending > 0
    );

    if (validDeputies.length < 10) {
      return { enrichedDeputies: [], descriptiveStats: null };
    }

    // Extract arrays
    const spending = validDeputies.map((d) => d.totalSpending);
    const hhi = validDeputies.map((d) => d.hhi?.value ?? 0);
    const roundValuePct = validDeputies.map((d) => d.roundValuePct ?? 0);
    const benfordChi2 = validDeputies.map((d) => d.benford?.chi2 ?? 0);

    // Calculate statistics
    const spendingStats = calculateStats(spending);
    const hhiStats = calculateStats(hhi);
    const benfordStats = calculateStats(benfordChi2);
    const roundStats = calculateStats(roundValuePct);

    // Calculate top supplier percentage stats
    const topSupplierPcts = validDeputies.map((d) => d.topSuppliers?.[0]?.pct ?? 0);
    const topSupplierStats = calculateStats(topSupplierPcts);

    // Enrich deputies
    const enriched: EnrichedDeputy[] = validDeputies.map((d) => {
      const topSupplierPct = d.topSuppliers?.[0]?.pct ?? 0;
      return {
        ...d,
        spendingZScore: calculateZScore(d.totalSpending, spendingStats.mean, spendingStats.std),
        hhiZScore: calculateZScore(d.hhi?.value ?? 0, hhiStats.mean, hhiStats.std),
        benfordZScore: calculateZScore(d.benford?.chi2 ?? 0, benfordStats.mean, benfordStats.std),
        roundValueZScore: calculateZScore(d.roundValuePct ?? 0, roundStats.mean, roundStats.std),
        topSupplierPct,
        topSupplierZScore: calculateZScore(topSupplierPct, topSupplierStats.mean, topSupplierStats.std),
        flagCount: d.redFlags?.length ?? 0,
      };
    });

    // Descriptive stats
    const descriptiveStats = {
      totalDeputies: validDeputies.length,
      spendingMean: spendingStats.mean,
      spendingMedian: [...spending].sort((a, b) => a - b)[Math.floor(spending.length / 2)],
      spendingStd: spendingStats.std,
      hhiMean: hhiStats.mean,
      benfordMean: benfordStats.mean,
      roundMean: roundStats.mean,
    };

    return { enrichedDeputies: enriched, descriptiveStats };
  }, [deputies]);

  // Filter and sort
  const filteredDeputies = useMemo(() => {
    let result = [...enrichedDeputies];

    if (showOnlyOutliers) {
      result = result.filter(
        (d) =>
          d.spendingZScore > zThreshold ||
          d.hhiZScore > zThreshold ||
          d.benfordZScore > zThreshold ||
          d.roundValueZScore > zThreshold ||
          d.topSupplierZScore > zThreshold ||
          Math.abs(d.zScoreParty ?? 0) > zThreshold ||
          Math.abs(d.zScoreState ?? 0) > zThreshold
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: number | string, bVal: number | string;
      switch (sortField) {
        case 'name': aVal = a.name; bVal = b.name; break;
        case 'totalSpending': aVal = a.totalSpending; bVal = b.totalSpending; break;
        case 'hhi': aVal = a.hhi?.value ?? 0; bVal = b.hhi?.value ?? 0; break;
        case 'benfordChi2': aVal = a.benford?.chi2 ?? 0; bVal = b.benford?.chi2 ?? 0; break;
        case 'roundValuePct': aVal = a.roundValuePct ?? 0; bVal = b.roundValuePct ?? 0; break;
        case 'topSupplierPct': aVal = a.topSupplierPct; bVal = b.topSupplierPct; break;
        case 'zScoreParty': aVal = a.zScoreParty ?? 0; bVal = b.zScoreParty ?? 0; break;
        case 'zScoreState': aVal = a.zScoreState ?? 0; bVal = b.zScoreState ?? 0; break;
        case 'riskScore': aVal = a.riskScore ?? 0; bVal = b.riskScore ?? 0; break;
        case 'flagCount': aVal = a.flagCount; bVal = b.flagCount; break;
        default: aVal = a.riskScore ?? 0; bVal = b.riskScore ?? 0;
      }
      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return result;
  }, [enrichedDeputies, showOnlyOutliers, zThreshold, sortField, sortDirection]);

  // Pagination
  const paginatedDeputies = filteredDeputies.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredDeputies.length / pageSize);

  // Count outliers
  const outlierCount = useMemo(() => {
    return enrichedDeputies.filter(
      (d) =>
        d.spendingZScore > zThreshold ||
        d.hhiZScore > zThreshold ||
        d.benfordZScore > zThreshold ||
        d.roundValueZScore > zThreshold ||
        d.topSupplierZScore > zThreshold ||
        Math.abs(d.zScoreParty ?? 0) > zThreshold ||
        Math.abs(d.zScoreState ?? 0) > zThreshold
    ).length;
  }, [enrichedDeputies, zThreshold]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(0);
  };

  if (!descriptiveStats) {
    return (
      <div className="p-4 text-center text-text-muted">
        Dados insuficientes para análise estatística
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Análise de Risco</h3>
          <p className="text-sm text-text-muted">
            {formatNumber(descriptiveStats.totalDeputies)} deputados analisados · {outlierCount} com indicadores atípicos
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-bg-secondary rounded-lg">
          <p className="text-xs text-text-muted uppercase tracking-wide">Média de Gastos</p>
          <p className="text-lg font-semibold text-accent-teal mt-1">
            {formatReais(descriptiveStats.spendingMean, true)}
          </p>
          <p className="text-xs text-text-muted">Mediana: {formatReais(descriptiveStats.spendingMedian, true)}</p>
        </div>
        <div className="p-3 bg-bg-secondary rounded-lg">
          <p className="text-xs text-text-muted uppercase tracking-wide">HHI Médio</p>
          <p className="text-lg font-semibold text-accent-amber mt-1">
            {formatNumber(descriptiveStats.hhiMean)}
          </p>
          <p className="text-xs text-text-muted">&lt; 1500 = diversificado</p>
        </div>
        <div className="p-3 bg-bg-secondary rounded-lg">
          <p className="text-xs text-text-muted uppercase tracking-wide">Benford χ² Médio</p>
          <p className="text-lg font-semibold text-text-primary mt-1">
            {descriptiveStats.benfordMean.toFixed(1)}
          </p>
          <p className="text-xs text-text-muted">&lt; 15.5 = esperado</p>
        </div>
        <div className="p-3 bg-bg-secondary rounded-lg">
          <p className="text-xs text-text-muted uppercase tracking-wide">% Redondos Médio</p>
          <p className="text-lg font-semibold text-accent-blue mt-1">
            {descriptiveStats.roundMean.toFixed(1)}%
          </p>
          <p className="text-xs text-text-muted">&lt; 15% = normal</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-muted">Z-score mínimo:</label>
          <input
            type="range"
            min="1.5"
            max="4"
            step="0.5"
            value={zThreshold}
            onChange={(e) => { setZThreshold(parseFloat(e.target.value)); setPage(0); }}
            className="w-24 accent-accent-teal"
          />
          <span className="text-xs font-mono text-accent-teal w-8">{zThreshold}</span>
        </div>
        <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyOutliers}
            onChange={(e) => { setShowOnlyOutliers(e.target.checked); setPage(0); }}
            className="accent-accent-teal"
          />
          Mostrar apenas outliers ({outlierCount})
        </label>
        <div className="ml-auto text-xs text-text-muted">
          {filteredDeputies.length} deputados · Página {page + 1} de {totalPages || 1}
        </div>
      </div>

      {/* Mobile scroll hint */}
      <p className="text-xs text-text-muted sm:hidden flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Deslize para ver mais colunas
      </p>

      {/* Risk Matrix Table */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="text-xs min-w-[800px] w-full" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '14%' }} /> {/* Deputado */}
            <col style={{ width: '9%' }} />  {/* Partido/UF */}
            <col style={{ width: '11%' }} /> {/* Gasto Total */}
            <col style={{ width: '8%' }} />  {/* HHI */}
            <col style={{ width: '9%' }} />  {/* Benford */}
            <col style={{ width: '9%' }} />  {/* % Redondos */}
            <col style={{ width: '9%' }} />  {/* Top Forn. */}
            <col style={{ width: '9%' }} />  {/* Z Partido */}
            <col style={{ width: '9%' }} />  {/* Z Estado */}
            <col style={{ width: '8%' }} />  {/* Score */}
            <col style={{ width: '5%' }} />  {/* Flags */}
          </colgroup>
          <thead>
            <tr className="border-b border-border">
              <SortableHeader label="Deputado" field="name" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
              <th className="py-2 px-2 text-text-muted font-medium text-left">Partido/UF</th>
              <SortableHeader label="Gasto" field="totalSpending" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} metric={METRIC_DEFINITIONS.totalSpending} align="right" />
              <SortableHeader label="HHI" field="hhi" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} metric={METRIC_DEFINITIONS.hhi} align="right" />
              <SortableHeader label="Benford" field="benfordChi2" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} metric={METRIC_DEFINITIONS.benfordChi2} align="right" />
              <SortableHeader label="% Red." field="roundValuePct" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} metric={METRIC_DEFINITIONS.roundValuePct} align="right" />
              <SortableHeader label="Top Forn." field="topSupplierPct" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} metric={METRIC_DEFINITIONS.topSupplierPct} align="right" />
              <SortableHeader label="Z Part." field="zScoreParty" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} metric={METRIC_DEFINITIONS.zScoreParty} align="right" />
              <SortableHeader label="Z UF" field="zScoreState" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} metric={METRIC_DEFINITIONS.zScoreState} align="right" />
              <SortableHeader label="Score" field="riskScore" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} metric={METRIC_DEFINITIONS.riskScore} align="right" />
              <SortableHeader label="Flags" field="flagCount" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} align="center" />
            </tr>
          </thead>
          <tbody>
            {paginatedDeputies.map((d) => {
              const zParty = d.zScoreParty ?? 0;
              const zState = d.zScoreState ?? 0;
              return (
                <tr key={d.id} className="border-b border-border/50 hover:bg-bg-secondary/50">
                  <td className="py-2 px-2 truncate">
                    {FEATURES.SHOW_DEPUTIES_TAB ? (
                      <Link to={`/deputado/${d.id}`} className="text-text-primary hover:text-accent-teal transition-colors">
                        {d.name}
                      </Link>
                    ) : (
                      <span className="text-text-primary">{d.name}</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-text-muted truncate">
                    {d.party}-{d.uf}
                  </td>
                  <td className={`py-2 px-2 text-right font-mono ${getZScoreBgClass(d.spendingZScore)}`}>
                    <span style={{ color: getZScoreColor(d.spendingZScore) || undefined }}>
                      {formatReais(d.totalSpending, true)}
                    </span>
                  </td>
                  <td className={`py-2 px-2 text-right font-mono ${getZScoreBgClass(d.hhiZScore)}`}>
                    <span style={{ color: getZScoreColor(d.hhiZScore) || undefined }}>
                      {formatNumber(d.hhi?.value ?? 0)}
                    </span>
                  </td>
                  <td className={`py-2 px-2 text-right font-mono ${getZScoreBgClass(d.benfordZScore)}`}>
                    <span style={{ color: getZScoreColor(d.benfordZScore) || undefined }}>
                      {(d.benford?.chi2 ?? 0).toFixed(1)}
                    </span>
                  </td>
                  <td className={`py-2 px-2 text-right font-mono ${getZScoreBgClass(d.roundValueZScore)}`}>
                    <span style={{ color: getZScoreColor(d.roundValueZScore) || undefined }}>
                      {(d.roundValuePct ?? 0).toFixed(1)}%
                    </span>
                  </td>
                  <td className={`py-2 px-2 text-right font-mono ${getZScoreBgClass(d.topSupplierZScore)}`}>
                    <span style={{ color: getZScoreColor(d.topSupplierZScore) || undefined }}>
                      {d.topSupplierPct.toFixed(1)}%
                    </span>
                  </td>
                  <td className={`py-2 px-2 text-right font-mono ${getZScoreBgClass(zParty)}`}>
                    <span style={{ color: getZScoreColor(zParty) || undefined }}>
                      {zParty >= 0 ? '+' : ''}{zParty.toFixed(1)}
                    </span>
                  </td>
                  <td className={`py-2 px-2 text-right font-mono ${getZScoreBgClass(zState)}`}>
                    <span style={{ color: getZScoreColor(zState) || undefined }}>
                      {zState >= 0 ? '+' : ''}{zState.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${getRiskLevelColor(d.riskLevel)}20`,
                        color: getRiskLevelColor(d.riskLevel),
                      }}
                    >
                      {((d.riskScore ?? 0) * 100).toFixed(0)}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    {d.flagCount > 0 && (
                      <span className="text-accent-red" title={d.redFlags?.join(', ')}>
                        {d.flagCount}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1 text-xs bg-bg-secondary rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-tertiary transition-colors"
          >
            Anterior
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = page < 3 ? i : page > totalPages - 3 ? totalPages - 5 + i : page - 2 + i;
              if (pageNum < 0 || pageNum >= totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-7 h-7 text-xs rounded ${page === pageNum ? 'bg-accent-teal text-white' : 'bg-bg-secondary hover:bg-bg-tertiary'}`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 text-xs bg-bg-secondary rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-tertiary transition-colors"
          >
            Próximo
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border text-xs text-text-muted">
        <span className="font-medium">Legenda de Z-score:</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-accent-amber/10" />
          <span>≥ 2.0</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-accent-amber/20" />
          <span>≥ 2.5</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-accent-red/20" />
          <span>≥ 3.0 (crítico)</span>
        </div>
        <div className="ml-auto">
          Clique nos headers para ordenar · Passe o mouse para ver explicações
        </div>
      </div>
    </div>
  );
}
