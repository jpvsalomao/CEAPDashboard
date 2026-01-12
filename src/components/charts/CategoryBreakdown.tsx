import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import type { CategoryData } from '../../types/data';
import { useThemeColors } from '../../utils/colors';
import { formatReais, formatNumber } from '../../utils/formatters';
import { getHorizontalBarMargins, getResponsiveFontSizes, truncateText } from '../../utils/responsive';

// Category groupings for semantic understanding
const CATEGORY_GROUPS: Record<string, { group: string; color: string }> = {
  // Viagens e Deslocamentos - Blue family
  'PASSAGEM AÉREA - SIGEPA': { group: 'Viagens', color: '#4A7C9B' },
  'PASSAGEM AÉREA - RPA': { group: 'Viagens', color: '#5A8FB2' },
  'LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES': { group: 'Viagens', color: '#3A6279' },
  'LOCAÇÃO OU FRETAMENTO DE AERONAVES': { group: 'Viagens', color: '#2D5066' },
  'COMBUSTÍVEIS E LUBRIFICANTES': { group: 'Viagens', color: '#6BA3C4' },
  'HOSPEDAGEM ,EXCETO DO PARLAMENTAR NO DISTRITO FEDERAL': { group: 'Viagens', color: '#7BB4D5' },
  // Escritório - Gray family
  'MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR': { group: 'Escritorio', color: '#6B7280' },
  'TELEFONIA': { group: 'Escritorio', color: '#9CA3AF' },
  'SERVIÇOS POSTAIS': { group: 'Escritorio', color: '#4B5563' },
  // Divulgação - Teal/Green
  'DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR': { group: 'Divulgacao', color: '#3D9996' },
  // Segurança - Amber
  'SERVIÇO DE SEGURANÇA PRESTADO POR EMPRESA ESPECIALIZADA': { group: 'Seguranca', color: '#D4A03A' },
  // Outros - Muted
  'CONSULTORIAS, PESQUISAS E TRABALHOS TÉCNICOS': { group: 'Outros', color: '#8B5CF6' },
  'PARTICIPAÇÃO EM CURSO, PALESTRA OU EVENTO SIMILAR': { group: 'Outros', color: '#A78BFA' },
  'FORNECIMENTO DE ALIMENTAÇÃO DO PARLAMENTAR': { group: 'Outros', color: '#C4B5FD' },
  'LOCAÇÃO OU FRETAMENTO DE EMBARCAÇÕES': { group: 'Viagens', color: '#8CC4E4' },
  'AQUISIÇÃO DE TOKENS E CERTIFICADOS DIGITAIS': { group: 'Escritorio', color: '#D1D5DB' },
  'ASSINATURA DE PUBLICAÇÕES': { group: 'Escritorio', color: '#E5E7EB' },
};

// Default color for unknown categories
const DEFAULT_CATEGORY_COLOR = '#6B7280';

interface EnrichedCategoryData extends CategoryData {
  cumulativePct: number;
  rank: number;
  group: string;
  groupColor: string;
  shortName: string;
}

interface CategoryBreakdownProps {
  data: CategoryData[];
  height?: number;
  maxItems?: number;
}

// Create abbreviated category names
function abbreviateCategory(name: string): string {
  const abbreviations: Record<string, string> = {
    'DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR': 'Divulgação Parlamentar',
    'LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES': 'Veículos (Locação)',
    'LOCAÇÃO OU FRETAMENTO DE AERONAVES': 'Aeronaves (Locação)',
    'PASSAGEM AÉREA - SIGEPA': 'Passagem Aérea (SIGEPA)',
    'PASSAGEM AÉREA - RPA': 'Passagem Aérea (RPA)',
    'MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR': 'Manutenção Escritório',
    'COMBUSTÍVEIS E LUBRIFICANTES': 'Combustíveis',
    'HOSPEDAGEM ,EXCETO DO PARLAMENTAR NO DISTRITO FEDERAL': 'Hospedagem',
    'TELEFONIA': 'Telefonia',
    'SERVIÇO DE SEGURANÇA PRESTADO POR EMPRESA ESPECIALIZADA': 'Segurança',
    'CONSULTORIAS, PESQUISAS E TRABALHOS TÉCNICOS': 'Consultorias',
    'SERVIÇOS POSTAIS': 'Serviços Postais',
    'PARTICIPAÇÃO EM CURSO, PALESTRA OU EVENTO SIMILAR': 'Cursos e Eventos',
    'FORNECIMENTO DE ALIMENTAÇÃO DO PARLAMENTAR': 'Alimentação',
    'LOCAÇÃO OU FRETAMENTO DE EMBARCAÇÕES': 'Embarcações (Locação)',
    'AQUISIÇÃO DE TOKENS E CERTIFICADOS DIGITAIS': 'Certificados Digitais',
    'ASSINATURA DE PUBLICAÇÕES': 'Assinaturas',
  };
  return abbreviations[name] || name;
}

export function CategoryBreakdown({
  data,
  height = 400,
  maxItems = 10,
}: CategoryBreakdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const themeColors = useThemeColors();

  // Enrich data with cumulative percentages and groupings
  const { enrichedData, totalValue, paretoIndex } = useMemo(() => {
    if (!data.length) {
      return { enrichedData: [] as EnrichedCategoryData[], totalValue: 0, paretoIndex: -1 };
    }

    const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, maxItems);
    const total = data.reduce((sum, d) => sum + d.value, 0);

    let cumulative = 0;
    let pareto80 = -1;

    const enriched: EnrichedCategoryData[] = sorted.map((d, i) => {
      cumulative += d.pct;
      if (pareto80 === -1 && cumulative >= 80) {
        pareto80 = i;
      }

      const groupInfo = CATEGORY_GROUPS[d.category] || { group: 'Outros', color: DEFAULT_CATEGORY_COLOR };

      return {
        ...d,
        cumulativePct: cumulative,
        rank: i + 1,
        group: groupInfo.group,
        groupColor: groupInfo.color,
        shortName: abbreviateCategory(d.category),
      };
    });

    return { enrichedData: enriched, totalValue: total, paretoIndex: pareto80 };
  }, [data, maxItems]);

  useEffect(() => {
    if (!enrichedData.length || !containerRef.current || !svgRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    // Responsive margins based on container width
    const baseMargin = getHorizontalBarMargins(containerWidth);
    const margin = { ...baseMargin, right: Math.max(40, baseMargin.right) };
    const fontSizes = getResponsiveFontSizes(containerWidth);
    const width = containerWidth - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const maxLabelWidth = margin.left - 12;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', containerWidth)
      .attr('height', height)
      .attr('viewBox', `0 0 ${containerWidth} ${height}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, d3.max(enrichedData, (d) => d.value) || 0])
      .range([0, width]);

    const xScalePct = d3
      .scaleLinear()
      .domain([0, 100])
      .range([0, width]);

    const yScale = d3
      .scaleBand<string>()
      .domain(enrichedData.map((d) => d.shortName))
      .range([0, chartHeight])
      .padding(0.25);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisBottom(xScale)
          .ticks(5)
          .tickSize(chartHeight)
          .tickFormat(() => '')
      )
      .call((sel) => sel.select('.domain').remove())
      .call((sel) => sel.selectAll('.tick line')
        .attr('stroke', themeColors.bgSecondary)
        .attr('stroke-opacity', 0.5));

    // Create tooltip element (appended to body)
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'tooltip';
    tooltipEl.style.opacity = '0';
    tooltipEl.style.position = 'fixed';
    tooltipEl.style.pointerEvents = 'none';
    tooltipEl.style.zIndex = '9999';
    document.body.appendChild(tooltipEl);

    // Draw bars with semantic colors
    const bars = g.selectAll('.bar')
      .data(enrichedData)
      .join('rect')
      .attr('class', 'bar')
      .attr('y', (d) => yScale(d.shortName) || 0)
      .attr('height', yScale.bandwidth())
      .attr('x', 0)
      .attr('width', 0)
      .attr('fill', (d) => d.groupColor)
      .attr('rx', 3)
      .style('cursor', 'pointer');

    // Animate bars
    bars
      .transition()
      .duration(800)
      .delay((_, i) => i * 40)
      .ease(d3.easeCubicOut)
      .attr('width', (d) => xScale(d.value));

    // Pareto line (cumulative percentage)
    const lineGenerator = d3.line<EnrichedCategoryData>()
      .x((d) => xScalePct(d.cumulativePct))
      .y((d) => (yScale(d.shortName) || 0) + yScale.bandwidth() / 2)
      .curve(d3.curveMonotoneY);

    const paretoLine = g.append('path')
      .datum(enrichedData)
      .attr('fill', 'none')
      .attr('stroke', themeColors.accentAmber)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,2')
      .attr('d', lineGenerator)
      .attr('opacity', 0);

    paretoLine
      .transition()
      .duration(800)
      .delay(600)
      .attr('opacity', 0.8);

    // Pareto dots
    g.selectAll('.pareto-dot')
      .data(enrichedData)
      .join('circle')
      .attr('class', 'pareto-dot')
      .attr('cx', (d) => xScalePct(d.cumulativePct))
      .attr('cy', (d) => (yScale(d.shortName) || 0) + yScale.bandwidth() / 2)
      .attr('r', 3)
      .attr('fill', themeColors.accentAmber)
      .attr('opacity', 0)
      .transition()
      .duration(400)
      .delay((_, i) => 600 + i * 40)
      .attr('opacity', 0.8);

    // Cumulative percentage labels (right side)
    g.selectAll('.label-cumulative')
      .data(enrichedData)
      .join('text')
      .attr('class', 'label-cumulative')
      .attr('x', width + 8)
      .attr('y', (d) => (yScale(d.shortName) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', themeColors.accentAmber)
      .attr('font-size', `${fontSizes.axis}px`)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('opacity', 0)
      .text((d) => `${d.cumulativePct.toFixed(0)}%`)
      .transition()
      .duration(400)
      .delay((_, i) => 800 + i * 40)
      .attr('opacity', 0.8);

    // Category labels (left side) - truncated based on available space
    g.selectAll('.label-category')
      .data(enrichedData)
      .join('text')
      .attr('class', 'label-category')
      .attr('x', -8)
      .attr('y', (d) => (yScale(d.shortName) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', themeColors.textSecondary)
      .attr('font-size', `${fontSizes.label}px`)
      .text((d) => truncateText(d.shortName, maxLabelWidth, fontSizes.label));

    // Value labels inside/outside bars - responsive threshold
    const valueThreshold = containerWidth < 480 ? 60 : 80;
    g.selectAll('.label-value')
      .data(enrichedData)
      .join('text')
      .attr('class', 'label-value')
      .attr('x', (d) => {
        const barWidth = xScale(d.value);
        return barWidth > valueThreshold ? barWidth - 6 : barWidth + 4;
      })
      .attr('y', (d) => (yScale(d.shortName) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d) => xScale(d.value) > valueThreshold ? 'end' : 'start')
      .attr('fill', (d) => xScale(d.value) > valueThreshold ? '#ffffff' : themeColors.textPrimary)
      .attr('font-size', `${fontSizes.axis}px`)
      .attr('font-weight', '600')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('opacity', 0)
      .text((d) => formatReais(d.value, true))
      .transition()
      .duration(400)
      .delay((_, i) => 400 + i * 40)
      .attr('opacity', 1);

    // Tooltip interactions
    bars
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 0.8);

        tooltipEl.innerHTML = `
          <div class="tooltip-title">${d.category}</div>
          <div class="space-y-1 mt-2">
            <div class="flex justify-between gap-6">
              <span class="text-text-muted">Valor:</span>
              <span class="font-mono font-medium">${formatReais(d.value)}</span>
            </div>
            <div class="flex justify-between gap-6">
              <span class="text-text-muted">% do total:</span>
              <span class="font-mono">${d.pct.toFixed(1)}%</span>
            </div>
            <div class="flex justify-between gap-6">
              <span class="text-text-muted">Acumulado:</span>
              <span class="font-mono text-accent-amber">${d.cumulativePct.toFixed(1)}%</span>
            </div>
            <div class="flex justify-between gap-6">
              <span class="text-text-muted">Transações:</span>
              <span>${formatNumber(d.transactionCount)}</span>
            </div>
            <div class="flex justify-between gap-6">
              <span class="text-text-muted">Ranking:</span>
              <span>${d.rank}º de ${enrichedData.length}</span>
            </div>
          </div>
          <div class="mt-2 pt-2 border-t border-border">
            <span class="text-xs px-1.5 py-0.5 rounded" style="background: ${d.groupColor}20; color: ${d.groupColor}">
              ${d.group}
            </span>
          </div>
        `;
        tooltipEl.style.opacity = '1';
        tooltipEl.style.left = `${event.clientX + 15}px`;
        tooltipEl.style.top = `${event.clientY - 10}px`;
      })
      .on('mousemove', function (event) {
        tooltipEl.style.left = `${event.clientX + 15}px`;
        tooltipEl.style.top = `${event.clientY - 10}px`;
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 1);
        tooltipEl.style.opacity = '0';
      });

    // Cleanup
    return () => {
      document.body.removeChild(tooltipEl);
    };
  }, [enrichedData, height, themeColors]);

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted">
        Sem dados disponíveis
      </div>
    );
  }

  // Calculate Pareto insight
  const paretoCategories = paretoIndex >= 0 ? paretoIndex + 1 : enrichedData.length;
  const paretoPct = paretoIndex >= 0 ? enrichedData[paretoIndex].cumulativePct : 100;

  return (
    <div className="space-y-3">
      {/* Header: Title + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Categorias de Despesa
          </h3>
          <p className="text-sm text-text-muted">
            {enrichedData.length} categorias · {formatReais(totalValue, true)} total
          </p>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="chart-container relative">
        <svg ref={svgRef} />
      </div>

      {/* Insights panel */}
      <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border text-xs">
        {/* Pareto insight */}
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-accent-amber rounded" />
          <span className="text-text-muted">
            Top {paretoCategories} = <span className="text-accent-amber font-medium">{paretoPct.toFixed(0)}%</span> do total
          </span>
        </div>

        {/* Group legend */}
        <div className="flex items-center gap-3 ml-auto">
          {['Viagens', 'Escritorio', 'Divulgacao', 'Outros'].map((group) => {
            const color = Object.values(CATEGORY_GROUPS).find(g => g.group === group)?.color || DEFAULT_CATEGORY_COLOR;
            return (
              <div key={group} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-text-muted">{group}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
