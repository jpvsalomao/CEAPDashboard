import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { formatReais } from '../../utils/formatters';

interface CategoryDeepDiveProps {
  deputies: Deputy[];
  categories: Array<{ category: string; value: number; pct: number; transactionCount: number }>;
  height?: number;
}

// Category short names for better display
const categoryShortNames: Record<string, string> = {
  'DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.': 'Divulgação',
  'LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES': 'Veículos',
  'PASSAGEM AÉREA - SIGEPA': 'Passagens Aéreas',
  'MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR': 'Escritório',
  'COMBUSTÍVEIS E LUBRIFICANTES.': 'Combustíveis',
  'HOSPEDAGEM ,EXCETO DO PARLAMENTAR NO DISTRITO FEDERAL.': 'Hospedagem',
  'TELEFONIA': 'Telefonia',
  'LOCAÇÃO OU FRETAMENTO DE AERONAVES': 'Aeronaves',
  'SERVIÇO DE SEGURANÇA PRESTADO POR EMPRESA ESPECIALIZADA.': 'Segurança',
  'FORNECIMENTO DE ALIMENTAÇÃO DO PARLAMENTAR': 'Alimentação',
};

// Risk indicators per category - based on analysis of patterns
const categoryRiskIndicators: Record<string, { risk: string; note: string }> = {
  'DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.': {
    risk: 'ALTO',
    note: '39% do total - categoria mais propensa a irregularidades',
  },
  'LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES': {
    risk: 'ALTO',
    note: 'Alvo de investigações (ex: Sostenes Cavalcante)',
  },
  'PASSAGEM AÉREA - SIGEPA': {
    risk: 'BAIXO',
    note: 'Compras via sistema oficial - menor risco',
  },
  'COMBUSTÍVEIS E LUBRIFICANTES.': {
    risk: 'MEDIO',
    note: 'Alto volume de transações pequenas',
  },
};

export function CategoryDeepDive({ deputies, categories, height = 400 }: CategoryDeepDiveProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Memoize top categories to prevent recalculations
  const topCategories = useMemo(() => categories.slice(0, 8), [categories]);

  // Get top deputies for selected category (approximation based on total spending patterns)
  const getTopDeputiesForCategory = useMemo(() => (category: string) => {
    // This is an approximation - in reality we'd need per-category spending data
    // Using total spending and risk level as proxy
    const riskInfo = categoryRiskIndicators[category];
    if (riskInfo?.risk === 'ALTO') {
      return deputies
        .filter((d) => d.riskLevel === 'CRITICO' || d.riskLevel === 'ALTO')
        .slice(0, 10);
    }
    return deputies.slice(0, 10);
  }, [deputies]);

  useEffect(() => {
    if (!containerRef.current || topCategories.length === 0) return;

    // Clear previous content
    d3.select(containerRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 120, bottom: 20, left: 140 };
    const width = containerRef.current.clientWidth;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const barHeight = innerHeight / topCategories.length;

    const svg = d3
      .select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // D3-controlled tooltip (no React state updates on hover)
    const tooltip = d3.select(tooltipRef.current);

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, d3.max(topCategories, (d) => d.value) || 0])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleBand()
      .domain(topCategories.map((d) => d.category))
      .range([0, innerHeight])
      .padding(0.25);

    // Color scale based on risk
    const getBarColor = (category: string) => {
      const risk = categoryRiskIndicators[category]?.risk;
      if (risk === 'ALTO') return '#DC4A4A';
      if (risk === 'MEDIO') return '#E5A84B';
      return '#4AA3A0';
    };

    // Helper to format tooltip content
    const formatTooltipContent = (d: { category: string; value: number; pct: number }) => {
      const riskInfo = categoryRiskIndicators[d.category];
      const riskBadge = riskInfo?.risk
        ? `<span style="display: inline-block; margin-top: 8px; padding: 2px 8px; border-radius: 4px; font-size: 11px; background: ${
            riskInfo.risk === 'ALTO' ? 'rgba(220,74,74,0.2)' : riskInfo.risk === 'MEDIO' ? 'rgba(229,168,75,0.2)' : 'rgba(46,204,113,0.2)'
          }; color: ${riskInfo.risk === 'ALTO' ? '#DC4A4A' : riskInfo.risk === 'MEDIO' ? '#E5A84B' : '#2ECC71'};">
            Risco ${riskInfo.risk}
          </span>${riskInfo.note ? `<p style="font-size: 11px; color: #6B7280; margin: 4px 0 0 0;">${riskInfo.note}</p>` : ''}`
        : '';

      return `
        <p style="font-size: 14px; font-weight: 500; color: #FAFAFA; margin: 0 0 4px 0;">
          ${categoryShortNames[d.category] || d.category}
        </p>
        <p style="font-size: 12px; color: #4AA3A0; font-family: monospace; margin: 0;">
          ${formatReais(d.value, true)} (${d.pct.toFixed(1)}%)
        </p>
        ${riskBadge}
      `;
    };

    // Shared hover handlers (D3-based, no React state updates)
    const showTooltip = (event: MouseEvent, d: { category: string; value: number; pct: number }) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      tooltip
        .style('opacity', 1)
        .style('left', `${Math.min(event.clientX - rect.left + 10, 300)}px`)
        .style('top', `${event.clientY - rect.top - 10}px`)
        .html(formatTooltipContent(d));
    };

    const moveTooltip = (event: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      tooltip
        .style('left', `${Math.min(event.clientX - rect.left + 10, 300)}px`)
        .style('top', `${event.clientY - rect.top - 10}px`);
    };

    const hideTooltip = () => {
      tooltip.style('opacity', 0);
    };

    // Draw bars with .join() for proper updates
    g.selectAll('rect.bar')
      .data(topCategories)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', (d) => yScale(d.category) ?? 0)
      .attr('height', yScale.bandwidth())
      .attr('rx', 4)
      .attr('fill', (d) => getBarColor(d.category))
      .attr('opacity', (d) => (selectedCategory === null || selectedCategory === d.category ? 1 : 0.3))
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        setSelectedCategory(selectedCategory === d.category ? null : d.category);
      })
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 1);
        showTooltip(event, d);
      })
      .on('mousemove', function (event) {
        moveTooltip(event);
      })
      .on('mouseleave', function (_, d) {
        d3.select(this).attr(
          'opacity',
          selectedCategory === null || selectedCategory === d.category ? 1 : 0.3
        );
        hideTooltip();
      })
      .attr('width', (d) => xScale(d.value));

    // Category labels on left
    g.selectAll('text.label')
      .data(topCategories)
      .join('text')
      .attr('class', 'label')
      .attr('x', -8)
      .attr('y', (d) => (yScale(d.category) ?? 0) + barHeight / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#A0A3B1')
      .attr('font-size', '12px')
      .text((d) => categoryShortNames[d.category] || d.category.substring(0, 20));

    // Percentage labels on right
    g.selectAll('text.pct')
      .data(topCategories)
      .join('text')
      .attr('class', 'pct')
      .attr('x', (d) => xScale(d.value) + 8)
      .attr('y', (d) => (yScale(d.category) ?? 0) + barHeight / 2)
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#6B7280')
      .attr('font-size', '11px')
      .text((d) => `${d.pct.toFixed(1)}%`);

    // Risk indicators
    g.selectAll('circle.risk')
      .data(topCategories.filter((d) => categoryRiskIndicators[d.category]))
      .join('circle')
      .attr('class', 'risk')
      .attr('cx', innerWidth + 50)
      .attr('cy', (d) => (yScale(d.category) ?? 0) + barHeight / 2)
      .attr('r', 6)
      .attr('fill', (d) => {
        const risk = categoryRiskIndicators[d.category]?.risk;
        if (risk === 'ALTO') return '#DC4A4A';
        if (risk === 'MEDIO') return '#E5A84B';
        return '#2ECC71';
      });

  }, [topCategories, height, selectedCategory]);

  const topDeputiesForSelected = selectedCategory
    ? getTopDeputiesForCategory(selectedCategory)
    : [];

  return (
    <div className="space-y-4">
      <div className="relative">
        <div ref={containerRef} />
        {/* D3-controlled tooltip (no React state updates on hover) */}
        <div
          ref={tooltipRef}
          className="absolute z-50 px-3 py-2 bg-bg-card border border-border rounded-lg shadow-lg pointer-events-none max-w-xs transition-opacity duration-150"
          style={{ opacity: 0 }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-text-muted">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-accent-red" />
          <span>Alto Risco</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-accent-amber" />
          <span>Médio Risco</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-accent-teal" />
          <span>Baixo Risco</span>
        </div>
        <p className="ml-auto text-text-muted">Clique em uma categoria para detalhes</p>
      </div>

      {/* Selected category detail */}
      {selectedCategory && (
        <div className="p-4 bg-bg-secondary rounded-lg border border-border">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-medium text-text-primary">
                {categoryShortNames[selectedCategory] || selectedCategory}
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                {categoryRiskIndicators[selectedCategory]?.note || 'Análise detalhada da categoria'}
              </p>
            </div>
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-text-muted hover:text-text-secondary"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-muted uppercase mb-2">Deputados em destaque</p>
              <ul className="space-y-1">
                {topDeputiesForSelected.slice(0, 5).map((deputy, idx) => (
                  <li key={deputy.id} className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">
                      {idx + 1}. {deputy.name}
                    </span>
                    <span className="font-mono text-accent-teal">
                      {formatReais(deputy.totalSpending, true)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase mb-2">Indicadores de Risco</p>
              <ul className="space-y-2 text-sm">
                {categoryRiskIndicators[selectedCategory]?.risk === 'ALTO' && (
                  <>
                    <li className="text-accent-red">• Categoria com maior volume de irregularidades</li>
                    <li className="text-accent-amber">• Requer verificação de documentação</li>
                    <li className="text-text-secondary">• Comparar com valores de mercado</li>
                  </>
                )}
                {categoryRiskIndicators[selectedCategory]?.risk === 'MEDIO' && (
                  <>
                    <li className="text-accent-amber">• Volume alto de transações pequenas</li>
                    <li className="text-text-secondary">• Verificar padroes de fracionamento</li>
                  </>
                )}
                {(!categoryRiskIndicators[selectedCategory] ||
                  categoryRiskIndicators[selectedCategory].risk === 'BAIXO') && (
                  <>
                    <li className="text-status-low">• Sistema oficial de compras</li>
                    <li className="text-text-secondary">• Menor incidência de irregularidades</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
