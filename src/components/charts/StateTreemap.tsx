import { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import type { StateData } from '../../types/data';
import { formatReais, formatNumber } from '../../utils/formatters';

// ============================================================================
// Configuration
// ============================================================================

const TREEMAP_CONFIG = {
  // Efficiency color scale (for per-deputy indicator)
  efficiency: {
    highThreshold: 1.2,   // 20% above average = high spender
    lowThreshold: 0.8,    // 20% below average = low spender
  },
} as const;

// State metadata
const STATE_INFO: Record<string, { name: string; region: string }> = {
  AC: { name: 'Acre', region: 'Norte' },
  AL: { name: 'Alagoas', region: 'Nordeste' },
  AM: { name: 'Amazonas', region: 'Norte' },
  AP: { name: 'Amapa', region: 'Norte' },
  BA: { name: 'Bahia', region: 'Nordeste' },
  CE: { name: 'Ceara', region: 'Nordeste' },
  DF: { name: 'Distrito Federal', region: 'Centro-Oeste' },
  ES: { name: 'Espirito Santo', region: 'Sudeste' },
  GO: { name: 'Goias', region: 'Centro-Oeste' },
  MA: { name: 'Maranhao', region: 'Nordeste' },
  MG: { name: 'Minas Gerais', region: 'Sudeste' },
  MS: { name: 'Mato Grosso do Sul', region: 'Centro-Oeste' },
  MT: { name: 'Mato Grosso', region: 'Centro-Oeste' },
  PA: { name: 'Para', region: 'Norte' },
  PB: { name: 'Paraiba', region: 'Nordeste' },
  PE: { name: 'Pernambuco', region: 'Nordeste' },
  PI: { name: 'Piaui', region: 'Nordeste' },
  PR: { name: 'Parana', region: 'Sul' },
  RJ: { name: 'Rio de Janeiro', region: 'Sudeste' },
  RN: { name: 'Rio Grande do Norte', region: 'Nordeste' },
  RO: { name: 'Rondonia', region: 'Norte' },
  RR: { name: 'Roraima', region: 'Norte' },
  RS: { name: 'Rio Grande do Sul', region: 'Sul' },
  SC: { name: 'Santa Catarina', region: 'Sul' },
  SE: { name: 'Sergipe', region: 'Nordeste' },
  SP: { name: 'Sao Paulo', region: 'Sudeste' },
  TO: { name: 'Tocantins', region: 'Norte' },
};

// Improved region colors - more contrast and saturation
const REGION_COLORS: Record<string, { base: string; light: string; dark: string; text: string }> = {
  Norte: { base: '#3D9996', light: '#4DB8B4', dark: '#2D7270', text: '#ffffff' },
  Nordeste: { base: '#D4973A', light: '#E5A84B', dark: '#B8832E', text: '#1a1a1a' },
  'Centro-Oeste': { base: '#C94444', light: '#DC5555', dark: '#A33636', text: '#ffffff' },
  Sudeste: { base: '#4A7C9B', light: '#5A8FB2', dark: '#3A6279', text: '#ffffff' },
  Sul: { base: '#2EAA5E', light: '#3CC470', dark: '#248A4B', text: '#ffffff' },
};

// ============================================================================
// Types
// ============================================================================

type MetricType = 'total' | 'perDeputy';

interface StateTreemapProps {
  data: StateData[];
  height?: number;
}

interface EnrichedTreemapNode {
  uf: string;
  name: string;
  region: string;
  value: number;
  deputyCount: number;
  avgPerDeputy: number;
  // Computed rankings
  rankOverall: number;
  rankInRegion: number;
  totalInRegion: number;
  efficiencyRatio: number;  // avgPerDeputy / national average
  percentOfTotal: number;
}

interface HierarchyNode {
  name: string;
  children?: HierarchyNode[];
  data?: EnrichedTreemapNode;
  value?: number;
}

interface RegionStats {
  region: string;
  total: number;
  deputies: number;
  avgPerDeputy: number;
  rankByTotal: number;
  rankByEfficiency: number;
}

// ============================================================================
// Component
// ============================================================================

export function StateTreemap({
  data,
  height = 400,
}: StateTreemapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [metric, setMetric] = useState<MetricType>('total');

  // Calculate totals and averages
  const { totalSpending, nationalAvgPerDeputy } = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const deputies = data.reduce((sum, d) => sum + d.deputyCount, 0);
    return {
      totalSpending: total,
      nationalAvgPerDeputy: deputies > 0 ? total / deputies : 0,
    };
  }, [data]);

  // Process data into hierarchical structure with enriched stats
  const { hierarchyData } = useMemo(() => {
    const dataMap = new Map<string, StateData>();
    data.forEach(d => dataMap.set(d.uf, d));

    // First pass: create all nodes with basic data
    const allNodes: EnrichedTreemapNode[] = [];
    const regionGroups = new Map<string, EnrichedTreemapNode[]>();

    Object.entries(STATE_INFO).forEach(([uf, info]) => {
      const stateData = dataMap.get(uf);
      if (!stateData || stateData.value === 0) return;

      const node: EnrichedTreemapNode = {
        uf,
        name: info.name,
        region: info.region,
        value: stateData.value,
        deputyCount: stateData.deputyCount,
        avgPerDeputy: stateData.avgPerDeputy,
        rankOverall: 0,
        rankInRegion: 0,
        totalInRegion: 0,
        efficiencyRatio: nationalAvgPerDeputy > 0
          ? stateData.avgPerDeputy / nationalAvgPerDeputy
          : 1,
        percentOfTotal: totalSpending > 0
          ? (stateData.value / totalSpending) * 100
          : 0,
      };

      allNodes.push(node);
      const existing = regionGroups.get(info.region) || [];
      existing.push(node);
      regionGroups.set(info.region, existing);
    });

    // Second pass: calculate rankings
    // Overall ranking by avgPerDeputy
    const sortedByEfficiency = [...allNodes].sort((a, b) => b.avgPerDeputy - a.avgPerDeputy);
    sortedByEfficiency.forEach((node, i) => {
      node.rankOverall = i + 1;
    });

    // Regional rankings
    regionGroups.forEach(nodes => {
      const sortedRegion = [...nodes].sort((a, b) => b.avgPerDeputy - a.avgPerDeputy);
      sortedRegion.forEach((node, i) => {
        node.rankInRegion = i + 1;
        node.totalInRegion = nodes.length;
      });
    });

    // Build hierarchy
    const root: HierarchyNode = {
      name: 'Brasil',
      children: Array.from(regionGroups.entries()).map(([region, states]) => ({
        name: region,
        children: states.map(s => ({
          name: s.uf,
          data: s,
          value: metric === 'total' ? s.value : s.avgPerDeputy,
        })),
      })),
    };

    return { hierarchyData: root };
  }, [data, totalSpending, nationalAvgPerDeputy, metric]);

  // Summary stats by region with rankings
  const regionStats = useMemo(() => {
    const stats = new Map<string, { total: number; deputies: number }>();

    data.forEach(d => {
      const region = STATE_INFO[d.uf]?.region;
      if (!region) return;

      const existing = stats.get(region) || { total: 0, deputies: 0 };
      stats.set(region, {
        total: existing.total + d.value,
        deputies: existing.deputies + d.deputyCount,
      });
    });

    const regionList: RegionStats[] = Array.from(stats.entries())
      .map(([region, s]) => ({
        region,
        total: s.total,
        deputies: s.deputies,
        avgPerDeputy: s.deputies > 0 ? s.total / s.deputies : 0,
        rankByTotal: 0,
        rankByEfficiency: 0,
      }));

    // Calculate rankings
    const sortedByTotal = [...regionList].sort((a, b) => b.total - a.total);
    sortedByTotal.forEach((r, i) => {
      const found = regionList.find(x => x.region === r.region);
      if (found) found.rankByTotal = i + 1;
    });

    const sortedByEfficiency = [...regionList].sort((a, b) => b.avgPerDeputy - a.avgPerDeputy);
    sortedByEfficiency.forEach((r, i) => {
      const found = regionList.find(x => x.region === r.region);
      if (found) found.rankByEfficiency = i + 1;
    });

    return regionList.sort((a, b) => b.total - a.total);
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !tooltipRef.current || !hierarchyData.children?.length) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const svg = d3.select(svgRef.current);
    const tooltipEl = tooltipRef.current;

    svg.selectAll('*').remove();

    // Create treemap layout
    const treemapLayout = d3.treemap<HierarchyNode>()
      .size([width, height])
      .paddingOuter(4)
      .paddingTop(22)
      .paddingInner(2)
      .round(true);

    // Create hierarchy
    const root = d3.hierarchy(hierarchyData)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    treemapLayout(root);

    // Draw region groups (parent nodes)
    const regionNodes = svg.selectAll('.region-group')
      .data(root.children || [])
      .join('g')
      .attr('class', 'region-group');

    // Region background
    regionNodes.append('rect')
      .attr('x', d => (d as d3.HierarchyRectangularNode<HierarchyNode>).x0)
      .attr('y', d => (d as d3.HierarchyRectangularNode<HierarchyNode>).y0)
      .attr('width', d => {
        const node = d as d3.HierarchyRectangularNode<HierarchyNode>;
        return Math.max(0, node.x1 - node.x0);
      })
      .attr('height', d => {
        const node = d as d3.HierarchyRectangularNode<HierarchyNode>;
        return Math.max(0, node.y1 - node.y0);
      })
      .attr('fill', d => {
        const colors = REGION_COLORS[d.data.name];
        return colors ? colors.dark : '#2a2b33';
      })
      .attr('rx', 4);

    // Region labels
    regionNodes.append('text')
      .attr('x', d => (d as d3.HierarchyRectangularNode<HierarchyNode>).x0 + 6)
      .attr('y', d => (d as d3.HierarchyRectangularNode<HierarchyNode>).y0 + 15)
      .attr('fill', '#fff')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text(d => d.data.name);

    // Draw state cells (leaf nodes)
    const leaves = root.leaves();

    const stateNodes = svg.selectAll('.state-cell')
      .data(leaves)
      .join('g')
      .attr('class', 'state-cell');

    // State rectangles with efficiency-based coloring
    stateNodes.append('rect')
      .attr('x', d => (d as d3.HierarchyRectangularNode<HierarchyNode>).x0)
      .attr('y', d => (d as d3.HierarchyRectangularNode<HierarchyNode>).y0)
      .attr('width', d => {
        const node = d as d3.HierarchyRectangularNode<HierarchyNode>;
        return Math.max(0, node.x1 - node.x0);
      })
      .attr('height', d => {
        const node = d as d3.HierarchyRectangularNode<HierarchyNode>;
        return Math.max(0, node.y1 - node.y0);
      })
      .attr('fill', d => {
        const stateData = d.data.data;
        const region = stateData?.region || '';
        const colors = REGION_COLORS[region];

        if (!colors) return '#3a3b43';

        // When viewing total, modulate brightness by efficiency
        if (metric === 'total' && stateData) {
          const ratio = stateData.efficiencyRatio;
          if (ratio >= TREEMAP_CONFIG.efficiency.highThreshold) {
            return colors.light;
          } else if (ratio <= TREEMAP_CONFIG.efficiency.lowThreshold) {
            return colors.dark;
          }
        }
        return colors.base;
      })
      .attr('stroke', d => {
        const stateData = d.data.data;
        const region = stateData?.region || '';
        const colors = REGION_COLORS[region];

        if (!colors) return '#4a4b53';

        // Highlight high efficiency states with white border when in total mode
        if (metric === 'total' && stateData && stateData.efficiencyRatio >= TREEMAP_CONFIG.efficiency.highThreshold) {
          return '#fff';
        }
        return colors.dark;
      })
      .attr('stroke-width', d => {
        const stateData = d.data.data;
        if (metric === 'total' && stateData && stateData.efficiencyRatio >= TREEMAP_CONFIG.efficiency.highThreshold) {
          return 2;
        }
        return 1;
      })
      .attr('rx', 2)
      .attr('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        const stateData = d.data.data;
        if (!stateData) return;

        d3.select(this)
          .attr('stroke-width', 3)
          .attr('stroke', '#fff');

        // Show tooltip using DOM manipulation for reliability
        tooltipEl.innerHTML = buildTooltipHtml(stateData, nationalAvgPerDeputy);
        tooltipEl.style.opacity = '1';
        tooltipEl.style.visibility = 'visible';

        // Position relative to mouse within container
        const rect = container.getBoundingClientRect();
        const x = event.clientX - rect.left + 15;
        const y = event.clientY - rect.top - 10;

        // Keep tooltip within bounds
        const tooltipRect = tooltipEl.getBoundingClientRect();
        const maxX = rect.width - tooltipRect.width - 10;
        const maxY = rect.height - tooltipRect.height - 10;

        tooltipEl.style.left = `${Math.min(x, maxX)}px`;
        tooltipEl.style.top = `${Math.max(10, Math.min(y, maxY))}px`;
      })
      .on('mousemove', function(event) {
        const rect = container.getBoundingClientRect();
        const x = event.clientX - rect.left + 15;
        const y = event.clientY - rect.top - 10;

        const tooltipRect = tooltipEl.getBoundingClientRect();
        const maxX = rect.width - tooltipRect.width - 10;
        const maxY = rect.height - tooltipRect.height - 10;

        tooltipEl.style.left = `${Math.min(x, maxX)}px`;
        tooltipEl.style.top = `${Math.max(10, Math.min(y, maxY))}px`;
      })
      .on('mouseleave', function(_, d) {
        const stateData = d.data.data;
        const region = stateData?.region || '';
        const colors = REGION_COLORS[region];

        const isHighSpender = metric === 'total' && stateData &&
          stateData.efficiencyRatio >= TREEMAP_CONFIG.efficiency.highThreshold;

        d3.select(this)
          .attr('stroke-width', isHighSpender ? 2 : 1)
          .attr('stroke', isHighSpender ? '#fff' : (colors ? colors.dark : '#4a4b53'));

        tooltipEl.style.opacity = '0';
        tooltipEl.style.visibility = 'hidden';
      });

    // State labels (UF code and value)
    stateNodes.each(function(d) {
      const node = d as d3.HierarchyRectangularNode<HierarchyNode>;
      const cellWidth = node.x1 - node.x0;
      const cellHeight = node.y1 - node.y0;

      // Only show label if cell is large enough
      if (cellWidth < 30 || cellHeight < 25) return;

      const g = d3.select(this);
      const stateData = d.data.data;
      const region = stateData?.region || '';
      const colors = REGION_COLORS[region];
      const textColor = colors?.text || '#fff';

      // Add text shadow for better readability
      const shadowColor = textColor === '#ffffff' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.3)';

      // UF code - larger and bolder
      g.append('text')
        .attr('x', node.x0 + cellWidth / 2)
        .attr('y', node.y0 + cellHeight / 2 - (cellHeight > 50 ? 6 : 2))
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', textColor)
        .attr('font-size', cellWidth > 80 ? '16px' : cellWidth > 50 ? '14px' : '12px')
        .attr('font-weight', '700')
        .attr('pointer-events', 'none')
        .style('text-shadow', `1px 1px 2px ${shadowColor}`)
        .text(d.data.name);

      // Value (if cell is large enough)
      if (cellWidth > 45 && cellHeight > 45 && stateData) {
        const displayValue = metric === 'total'
          ? formatReais(stateData.value, true)
          : formatReais(stateData.avgPerDeputy, true);

        g.append('text')
          .attr('x', node.x0 + cellWidth / 2)
          .attr('y', node.y0 + cellHeight / 2 + 12)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', textColor)
          .attr('opacity', 0.9)
          .attr('font-size', cellWidth > 70 ? '11px' : '10px')
          .attr('font-weight', '500')
          .attr('pointer-events', 'none')
          .style('text-shadow', `1px 1px 2px ${shadowColor}`)
          .text(displayValue);
      }
    });

  }, [hierarchyData, height, metric, nationalAvgPerDeputy]);

  return (
    <div className="w-full space-y-3">
      {/* Header: Title + Controls + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Distribuição por Estado
          </h3>
          <p className="text-sm text-text-muted">
            {metric === 'total'
              ? 'Tamanho = gasto total · Borda clara = gasto alto por deputado'
              : 'Tamanho = gasto médio por deputado'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-bg-secondary rounded-lg p-1 gap-1">
            <button
              onClick={() => setMetric('total')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                metric === 'total'
                  ? 'bg-accent-teal/20 text-accent-teal font-medium'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Total
            </button>
            <button
              onClick={() => setMetric('perDeputy')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                metric === 'perDeputy'
                  ? 'bg-accent-teal/20 text-accent-teal font-medium'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Por deputado
            </button>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="relative">
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          className="overflow-visible"
        />
        <div
          ref={tooltipRef}
          className="tooltip"
          style={{
            opacity: 0,
            visibility: 'hidden',
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 100,
            transition: 'opacity 0.15s ease',
          }}
        />
      </div>

      {/* Region summary stats - enhanced */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        {regionStats.map(({ region, total, deputies, avgPerDeputy, rankByEfficiency }) => (
          <div
            key={region}
            className="bg-bg-secondary rounded-lg p-3"
            style={{ borderLeft: `3px solid ${REGION_COLORS[region]?.base || '#666'}` }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-text-muted">{region}</span>
              <span className="text-xs text-text-muted">#{rankByEfficiency}</span>
            </div>
            <p className="text-sm font-semibold text-text-primary">
              {formatReais(total, true)}
            </p>
            <p className="text-xs text-text-muted">
              {deputies} deputados
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {formatReais(avgPerDeputy, true)}/dep
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Tooltip Builder
// ============================================================================

function buildTooltipHtml(
  state: EnrichedTreemapNode,
  nationalAvg: number
): string {
  const efficiencyPercent = ((state.efficiencyRatio - 1) * 100).toFixed(1);
  const efficiencySign = state.efficiencyRatio >= 1 ? '+' : '';
  const efficiencyClass = state.efficiencyRatio >= TREEMAP_CONFIG.efficiency.highThreshold
    ? 'text-accent-red'
    : state.efficiencyRatio <= TREEMAP_CONFIG.efficiency.lowThreshold
      ? 'text-status-low'
      : 'text-text-secondary';

  return `
    <div class="tooltip-title">${state.name} (${state.uf})</div>
    <div class="tooltip-label">${state.region}</div>

    <div style="margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <div>
        <div class="tooltip-value">${formatReais(state.value, true)}</div>
        <div class="tooltip-label">Total</div>
      </div>
      <div>
        <div class="tooltip-value">${formatNumber(state.deputyCount)}</div>
        <div class="tooltip-label">Deputados</div>
      </div>
    </div>

    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--color-border);">
      <div class="tooltip-value">${formatReais(state.avgPerDeputy, true)}</div>
      <div class="tooltip-label">Media por deputado</div>
      <div class="text-xs ${efficiencyClass}" style="margin-top: 2px;">
        ${efficiencySign}${efficiencyPercent}% vs media nacional (${formatReais(nationalAvg, true)})
      </div>
    </div>

    <div style="margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <div>
        <div class="text-xs text-text-secondary">#${state.rankOverall} de 27</div>
        <div class="tooltip-label">Ranking nacional</div>
      </div>
      <div>
        <div class="text-xs text-text-secondary">#${state.rankInRegion} de ${state.totalInRegion}</div>
        <div class="tooltip-label">Na regiao</div>
      </div>
    </div>

    <div style="margin-top: 4px;">
      <div class="text-xs text-text-muted">${state.percentOfTotal.toFixed(1)}% do total nacional</div>
    </div>
  `;
}
