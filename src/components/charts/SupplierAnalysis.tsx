import { useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { formatReais, formatPercent, formatNumber } from '../../utils/formatters';
import { colors } from '../../utils/colors';

interface SupplierAnalysisProps {
  deputy: Deputy;
  allDeputies: Deputy[];
}

interface SupplierMetrics {
  name: string;
  cnpj: string;
  value: number;
  pct: number;
  rank: number;
  concentrationLevel: 'low' | 'medium' | 'high' | 'critical';
  sharedWith: number; // Number of other deputies using this supplier
}

export function SupplierAnalysis({ deputy, allDeputies }: SupplierAnalysisProps) {
  const chartRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate supplier metrics
  const supplierMetrics = useMemo((): SupplierMetrics[] => {
    if (!deputy.topSuppliers?.length) return [];

    // Build map of all supplier CNPJs to deputy counts
    const supplierDeputyCounts = new Map<string, number>();
    allDeputies.forEach(d => {
      if (d.id === deputy.id) return;
      d.topSuppliers?.forEach(s => {
        if (s.cnpj) {
          supplierDeputyCounts.set(s.cnpj, (supplierDeputyCounts.get(s.cnpj) || 0) + 1);
        }
      });
    });

    return deputy.topSuppliers.map((s, idx) => ({
      name: s.name,
      cnpj: s.cnpj || 'N/A',
      value: s.value,
      pct: s.pct,
      rank: idx + 1,
      concentrationLevel:
        s.pct > 50 ? 'critical' : s.pct > 30 ? 'high' : s.pct > 15 ? 'medium' : 'low',
      sharedWith: s.cnpj ? supplierDeputyCounts.get(s.cnpj) || 0 : 0,
    }));
  }, [deputy.topSuppliers, allDeputies, deputy.id]);

  // Calculate HHI breakdown
  const hhiBreakdown = useMemo(() => {
    if (!deputy.topSuppliers?.length) return { top1: 0, top3: 0, top5: 0, rest: 0 };

    const sorted = [...deputy.topSuppliers].sort((a, b) => b.pct - a.pct);
    const top1 = Math.pow(sorted[0]?.pct || 0, 2);
    const top3 = sorted.slice(0, 3).reduce((sum, s) => sum + Math.pow(s.pct, 2), 0);
    const top5 = sorted.slice(0, 5).reduce((sum, s) => sum + Math.pow(s.pct, 2), 0);
    const total = deputy.hhi.value;

    return {
      top1: (top1 / 100) * 100, // As percentage of max HHI (10000)
      top3: (top3 / 100) * 100,
      top5: (top5 / 100) * 100,
      rest: Math.max(0, total - top5),
    };
  }, [deputy.topSuppliers, deputy.hhi.value]);

  // Diversity score (inverse of HHI, normalized)
  const diversityScore = useMemo(() => {
    // Lower HHI = higher diversity
    // HHI ranges from 0 (perfectly diverse) to 10000 (monopoly)
    const normalized = Math.max(0, Math.min(100, 100 - deputy.hhi.value / 100));
    return normalized;
  }, [deputy.hhi.value]);

  // Average metrics for comparison
  const avgMetrics = useMemo(() => {
    const filtered = allDeputies.filter(
      d => !d.name.includes('LIDERANÇA') && d.transactionCount > 10
    );
    if (filtered.length === 0) return { hhi: 0, supplierCount: 0, topSupplierPct: 0 };

    return {
      hhi: filtered.reduce((s, d) => s + d.hhi.value, 0) / filtered.length,
      supplierCount: filtered.reduce((s, d) => s + d.supplierCount, 0) / filtered.length,
      topSupplierPct:
        filtered.reduce((s, d) => s + (d.topSuppliers?.[0]?.pct || 0), 0) / filtered.length,
    };
  }, [allDeputies]);

  // D3 Treemap visualization
  useEffect(() => {
    if (!chartRef.current || !supplierMetrics.length) return;

    const svg = d3.select(chartRef.current);
    svg.selectAll('*').remove();

    const width = chartRef.current.clientWidth;
    const height = 200;

    svg.attr('width', width).attr('height', height);

    // Define the data type for treemap nodes
    interface TreemapData {
      name: string;
      value?: number;
      data?: SupplierMetrics;
      children?: TreemapData[];
    }

    // Create treemap data
    const root = d3
      .hierarchy<TreemapData>({
        name: 'root',
        children: supplierMetrics.slice(0, 10).map(s => ({
          name: s.name,
          value: s.pct,
          data: s,
        })),
      })
      .sum(d => d.value || 0);

    const treemap = d3.treemap<TreemapData>().size([width, height]).padding(2).round(true);

    const treemapRoot = treemap(root);

    const getColor = (level: string) => {
      switch (level) {
        case 'critical':
          return colors.accentRed;
        case 'high':
          return colors.accentAmber;
        case 'medium':
          return colors.accentBlue;
        default:
          return colors.accentTeal;
      }
    };

    // Setup tooltip
    const tooltip = d3
      .select(tooltipRef.current)
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', colors.bgCard)
      .style('border', `1px solid ${colors.bgCardSolid}`)
      .style('border-radius', '8px')
      .style('padding', '12px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('max-width', '280px')
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)');

    // Draw treemap cells
    const leaves = treemapRoot.leaves();
    const cells = svg
      .selectAll<SVGGElement, d3.HierarchyRectangularNode<TreemapData>>('g')
      .data(leaves)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    cells
      .append('rect')
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => {
        const data = d.data.data;
        return getColor(data?.concentrationLevel || 'low');
      })
      .attr('opacity', 0.8)
      .attr('rx', 4)
      .style('cursor', 'pointer')
      .on('mouseenter', function (_event, d) {
        d3.select(this).attr('opacity', 1);
        const data = d.data.data;
        if (data) {
          tooltip.style('visibility', 'visible').html(`
            <div class="space-y-1">
              <p class="font-medium" style="color: ${colors.textPrimary}">${data.name}</p>
              <p style="color: ${colors.textMuted}; font-size: 10px;">CNPJ: ${data.cnpj}</p>
              <p style="color: ${colors.textSecondary}">Valor: ${formatReais(data.value)}</p>
              <p style="color: ${colors.textSecondary}">${formatPercent(data.pct)} do total</p>
              <p style="color: ${colors.textMuted}">Rank: #${data.rank}</p>
              ${data.sharedWith > 0 ? `<p style="color: ${colors.accentTeal}">Compartilhado com ${data.sharedWith} deputados</p>` : ''}
            </div>
          `);
        }
      })
      .on('mousemove', function (event) {
        tooltip.style('left', `${event.pageX + 10}px`).style('top', `${event.pageY - 10}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 0.8);
        tooltip.style('visibility', 'hidden');
      });

    // Add labels for larger cells
    cells
      .filter(d => d.x1 - d.x0 > 60 && d.y1 - d.y0 > 30)
      .append('text')
      .attr('x', 6)
      .attr('y', 18)
      .attr('fill', colors.textPrimary)
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .text(d => {
        const name = d.data.name;
        const maxLen = Math.floor((d.x1 - d.x0 - 12) / 6);
        return name.length > maxLen ? name.slice(0, maxLen - 2) + '..' : name;
      });

    cells
      .filter(d => d.x1 - d.x0 > 50 && d.y1 - d.y0 > 45)
      .append('text')
      .attr('x', 6)
      .attr('y', 34)
      .attr('fill', colors.textSecondary)
      .attr('font-size', '10px')
      .text(d => {
        const data = d.data.data;
        return data ? formatPercent(data.pct) : '';
      });
  }, [supplierMetrics]);

  if (!deputy.topSuppliers?.length) {
    return (
      <div className="p-6 text-center text-text-muted">
        Dados de fornecedores não disponíveis para este deputado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tooltip container */}
      <div ref={tooltipRef} />

      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary">Análise de Fornecedores</h3>
        <p className="text-sm text-text-muted">
          {formatNumber(deputy.supplierCount)} fornecedores utilizados
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-bg-card rounded-lg p-3">
          <p className="text-xs text-text-muted mb-1">Índice HHI</p>
          <p className="text-xl font-bold text-text-primary">{deputy.hhi.value.toFixed(0)}</p>
          <p
            className={`text-xs ${deputy.hhi.value > avgMetrics.hhi ? 'text-accent-amber' : 'text-accent-teal'}`}
          >
            {((deputy.hhi.value / avgMetrics.hhi - 1) * 100).toFixed(0)}% vs média
          </p>
        </div>
        <div className="bg-bg-card rounded-lg p-3">
          <p className="text-xs text-text-muted mb-1">Diversidade</p>
          <p className="text-xl font-bold text-text-primary">{diversityScore.toFixed(0)}%</p>
          <p className="text-xs text-text-muted">
            {diversityScore > 70 ? 'Alta' : diversityScore > 40 ? 'Moderada' : 'Baixa'}
          </p>
        </div>
        <div className="bg-bg-card rounded-lg p-3">
          <p className="text-xs text-text-muted mb-1">Top Fornecedor</p>
          <p className="text-xl font-bold text-text-primary">
            {formatPercent(deputy.topSuppliers[0]?.pct || 0)}
          </p>
          <p
            className={`text-xs ${(deputy.topSuppliers[0]?.pct || 0) > avgMetrics.topSupplierPct ? 'text-accent-amber' : 'text-accent-teal'}`}
          >
            {(((deputy.topSuppliers[0]?.pct || 0) / avgMetrics.topSupplierPct - 1) * 100).toFixed(0)}
            % vs média
          </p>
        </div>
        <div className="bg-bg-card rounded-lg p-3">
          <p className="text-xs text-text-muted mb-1">Fornecedores</p>
          <p className="text-xl font-bold text-text-primary">{deputy.supplierCount}</p>
          <p
            className={`text-xs ${deputy.supplierCount < avgMetrics.supplierCount ? 'text-accent-amber' : 'text-accent-teal'}`}
          >
            {((deputy.supplierCount / avgMetrics.supplierCount - 1) * 100).toFixed(0)}% vs média
          </p>
        </div>
      </div>

      {/* HHI Breakdown */}
      <div className="bg-bg-card rounded-lg p-4">
        <h4 className="text-sm font-medium text-text-primary mb-3">Composição do HHI</h4>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>Top 1 fornecedor</span>
              <span>{hhiBreakdown.top1.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-red"
                style={{ width: `${Math.min(100, hhiBreakdown.top1)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>Top 3 fornecedores</span>
              <span>{hhiBreakdown.top3.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-amber"
                style={{ width: `${Math.min(100, hhiBreakdown.top3)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>Top 5 fornecedores</span>
              <span>{hhiBreakdown.top5.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-teal"
                style={{ width: `${Math.min(100, hhiBreakdown.top5)}%` }}
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-text-muted mt-3">
          HHI mede concentração: 0 = totalmente diverso, 10.000 = monopólio
        </p>
      </div>

      {/* Treemap */}
      <div className="bg-bg-card rounded-lg p-4">
        <h4 className="text-sm font-medium text-text-primary mb-3">
          Distribuição de Gastos por Fornecedor
        </h4>
        <svg ref={chartRef} className="w-full" />
        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: colors.accentRed }}
            />
            <span className="text-text-muted">&gt;50%</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: colors.accentAmber }}
            />
            <span className="text-text-muted">30-50%</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: colors.accentBlue }}
            />
            <span className="text-text-muted">15-30%</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: colors.accentTeal }}
            />
            <span className="text-text-muted">&lt;15%</span>
          </div>
        </div>
      </div>

      {/* Shared Suppliers */}
      {supplierMetrics.some(s => s.sharedWith > 0) && (
        <div className="bg-bg-card rounded-lg p-4">
          <h4 className="text-sm font-medium text-text-primary mb-3">
            Fornecedores Compartilhados
          </h4>
          <div className="space-y-2">
            {supplierMetrics
              .filter(s => s.sharedWith > 0)
              .slice(0, 5)
              .map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-primary truncate">{s.name}</p>
                    <p className="text-xs text-text-muted">{formatPercent(s.pct)} do total</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-accent-teal/20 text-accent-teal text-xs rounded-full">
                      +{s.sharedWith} deputados
                    </span>
                  </div>
                </div>
              ))}
          </div>
          <p className="text-xs text-text-muted mt-3">
            Fornecedores utilizados por outros deputados no mesmo período
          </p>
        </div>
      )}

      {/* Risk Summary */}
      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor:
            deputy.hhi.level === 'CRITICO'
              ? `${colors.accentRed}20`
              : deputy.hhi.level === 'ALTO'
                ? `${colors.accentAmber}20`
                : `${colors.accentTeal}20`,
        }}
      >
        <div className="flex items-start gap-3">
          <span className="text-xl">
            {deputy.hhi.level === 'CRITICO' || deputy.hhi.level === 'ALTO' ? '⚠️' : '✓'}
          </span>
          <div>
            <p className="font-medium text-text-primary">
              {deputy.hhi.level === 'CRITICO'
                ? 'Concentração Crítica'
                : deputy.hhi.level === 'ALTO'
                  ? 'Concentração Alta'
                  : deputy.hhi.level === 'MEDIO'
                    ? 'Concentração Moderada'
                    : 'Diversificação Saudável'}
            </p>
            <p className="text-sm text-text-secondary mt-1">
              {deputy.hhi.level === 'CRITICO' || deputy.hhi.level === 'ALTO'
                ? `O deputado concentra ${formatPercent(deputy.topSuppliers[0]?.pct || 0)} dos gastos em um único fornecedor. Isso pode indicar dependência excessiva ou relacionamento especial.`
                : deputy.hhi.level === 'MEDIO'
                  ? 'A concentração está dentro de parâmetros aceitáveis, mas merece acompanhamento.'
                  : 'Os gastos estão bem distribuídos entre múltiplos fornecedores.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
