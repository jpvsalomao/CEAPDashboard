import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { useThemeColors } from '../../utils/colors';
import { formatNumber, formatReais } from '../../utils/formatters';
import { getHorizontalBarMargins, getResponsiveFontSizes, truncateText } from '../../utils/responsive';

interface ProfileOverviewProps {
  deputies: Deputy[];
}

interface DistributionItem {
  label: string;
  count: number;
  pct: number;
  color: string;
  avgSpending?: number;
  deputyNames?: string[];
}

// Color palette for charts
const CHART_COLORS = [
  '#4AA3A0', // accent-teal
  '#5B8DEF', // accent-blue
  '#E5A84B', // accent-amber
  '#2ECC71', // green
  '#9B59B6', // purple
  '#DC4A4A', // accent-red
  '#95A5A6', // gray
];

export function ProfileOverview({ deputies }: ProfileOverviewProps) {
  // Calculate education distribution
  const educationDist = useMemo(() => {
    const counts: Record<string, { count: number; totalSpending: number; names: string[] }> = {};
    deputies.forEach(d => {
      if (d.education) {
        const edu = d.education.trim();
        if (!counts[edu]) {
          counts[edu] = { count: 0, totalSpending: 0, names: [] };
        }
        counts[edu].count++;
        counts[edu].totalSpending += d.totalSpending;
        counts[edu].names.push(d.name);
      }
    });

    const total = Object.values(counts).reduce((a, b) => a + b.count, 0);
    if (total === 0) return [];

    return Object.entries(counts)
      .map(([label, data], i) => ({
        label,
        count: data.count,
        pct: (data.count / total) * 100,
        color: CHART_COLORS[i % CHART_COLORS.length],
        avgSpending: data.totalSpending / data.count,
        deputyNames: data.names.slice(0, 5),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [deputies]);

  // Calculate mandate/experience distribution
  const mandateDist = useMemo(() => {
    const brackets: Record<string, { count: number; totalSpending: number; names: string[] }> = {
      'Primeiro mandato': { count: 0, totalSpending: 0, names: [] },
      '2-3 mandatos': { count: 0, totalSpending: 0, names: [] },
      '4-5 mandatos': { count: 0, totalSpending: 0, names: [] },
      '6+ mandatos': { count: 0, totalSpending: 0, names: [] },
    };

    deputies.forEach(d => {
      const mc = d.mandateCount ?? 1;
      let key: string;
      if (mc === 1) key = 'Primeiro mandato';
      else if (mc <= 3) key = '2-3 mandatos';
      else if (mc <= 5) key = '4-5 mandatos';
      else key = '6+ mandatos';

      brackets[key].count++;
      brackets[key].totalSpending += d.totalSpending;
      if (brackets[key].names.length < 5) {
        brackets[key].names.push(d.name);
      }
    });

    const total = Object.values(brackets).reduce((a, b) => a + b.count, 0);
    if (total === 0) return [];

    return Object.entries(brackets)
      .map(([label, data], i) => ({
        label,
        count: data.count,
        pct: (data.count / total) * 100,
        color: CHART_COLORS[i % CHART_COLORS.length],
        avgSpending: data.count > 0 ? data.totalSpending / data.count : 0,
        deputyNames: data.names,
      }))
      .filter(item => item.count > 0);
  }, [deputies]);

  // Calculate age distribution
  const ageDist = useMemo(() => {
    const brackets: Record<string, { count: number; totalSpending: number; names: string[] }> = {
      '30-40 anos': { count: 0, totalSpending: 0, names: [] },
      '40-50 anos': { count: 0, totalSpending: 0, names: [] },
      '50-60 anos': { count: 0, totalSpending: 0, names: [] },
      '60-70 anos': { count: 0, totalSpending: 0, names: [] },
      '70+ anos': { count: 0, totalSpending: 0, names: [] },
    };

    deputies.forEach(d => {
      const age = d.age;
      if (!age) return;
      let key: string;
      if (age < 40) key = '30-40 anos';
      else if (age < 50) key = '40-50 anos';
      else if (age < 60) key = '50-60 anos';
      else if (age < 70) key = '60-70 anos';
      else key = '70+ anos';

      brackets[key].count++;
      brackets[key].totalSpending += d.totalSpending;
      if (brackets[key].names.length < 5) {
        brackets[key].names.push(d.name);
      }
    });

    const total = Object.values(brackets).reduce((a, b) => a + b.count, 0);
    if (total === 0) return [];

    return Object.entries(brackets)
      .map(([label, data], i) => ({
        label,
        count: data.count,
        pct: (data.count / total) * 100,
        color: CHART_COLORS[i % CHART_COLORS.length],
        avgSpending: data.count > 0 ? data.totalSpending / data.count : 0,
        deputyNames: data.names,
      }))
      .filter(item => item.count > 0);
  }, [deputies]);

  // Calculate profession distribution
  const professionDist = useMemo(() => {
    const counts: Record<string, { count: number; totalSpending: number; names: string[] }> = {};
    deputies.forEach(d => {
      if (d.profession && d.profession !== 'Não informado') {
        if (!counts[d.profession]) {
          counts[d.profession] = { count: 0, totalSpending: 0, names: [] };
        }
        counts[d.profession].count++;
        counts[d.profession].totalSpending += d.totalSpending;
        if (counts[d.profession].names.length < 5) {
          counts[d.profession].names.push(d.name);
        }
      }
    });

    const total = Object.values(counts).reduce((a, b) => a + b.count, 0);
    if (total === 0) return [];

    // Get top 5, combine rest as "Outros"
    const sorted = Object.entries(counts)
      .map(([label, data]) => ({
        label,
        count: data.count,
        pct: (data.count / total) * 100,
        avgSpending: data.totalSpending / data.count,
        deputyNames: data.names,
      }))
      .sort((a, b) => b.count - a.count);

    const top5 = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    const restCount = rest.reduce((sum, item) => sum + item.count, 0);
    const restSpending = rest.reduce((sum, item) => sum + (item.avgSpending * item.count), 0);

    const result: DistributionItem[] = top5.map((item, i) => ({
      ...item,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));

    if (restCount > 0) {
      result.push({
        label: 'Outros',
        count: restCount,
        pct: (restCount / total) * 100,
        color: CHART_COLORS[6],
        avgSpending: restSpending / restCount,
        deputyNames: [`+${rest.length} profissões`],
      });
    }

    return result;
  }, [deputies]);

  // Don't render if no data
  if (!educationDist.length && !mandateDist.length && !ageDist.length && !professionDist.length) {
    return null;
  }

  const totalDeputiesWithEducation = educationDist.reduce((sum, d) => sum + d.count, 0);
  const totalDeputiesWithMandate = mandateDist.reduce((sum, d) => sum + d.count, 0);
  const totalDeputiesWithAge = ageDist.reduce((sum, d) => sum + d.count, 0);
  const totalDeputiesWithProfession = professionDist.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-8 bg-accent-teal rounded-full" />
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Perfil dos Deputados</h2>
          <p className="text-sm text-text-muted">Características demográficas e profissionais</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Education Distribution */}
        {educationDist.length > 0 && (
          <div className="glass-card p-6">
            <ProfileBarChart
              title="Escolaridade"
              subtitle={`${formatNumber(totalDeputiesWithEducation)} deputados com dados`}
              data={educationDist}
              height={220}
            />
          </div>
        )}

        {/* Experience/Mandate Distribution */}
        {mandateDist.length > 0 && (
          <div className="glass-card p-6">
            <ProfileBarChart
              title="Experiência Parlamentar"
              subtitle={`${formatNumber(totalDeputiesWithMandate)} deputados`}
              data={mandateDist}
              height={220}
            />
          </div>
        )}

        {/* Age Distribution */}
        {ageDist.length > 0 && (
          <div className="glass-card p-6">
            <ProfileBarChart
              title="Faixa Etária"
              subtitle={`${formatNumber(totalDeputiesWithAge)} deputados com dados`}
              data={ageDist}
              height={220}
            />
          </div>
        )}

        {/* Profession Distribution */}
        {professionDist.length > 0 && (
          <div className="glass-card p-6">
            <ProfileBarChart
              title="Profissão de Origem"
              subtitle={`${formatNumber(totalDeputiesWithProfession)} deputados com dados`}
              data={professionDist}
              height={220}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface ProfileBarChartProps {
  title: string;
  subtitle: string;
  data: DistributionItem[];
  height?: number;
}

function ProfileBarChart({ title, subtitle, data, height = 200 }: ProfileBarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const themeColors = useThemeColors();

  useEffect(() => {
    if (!data.length || !containerRef.current || !svgRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const baseMargin = getHorizontalBarMargins(containerWidth);
    const margin = {
      top: 8,
      right: 50,
      bottom: 8,
      left: Math.min(baseMargin.left, 120)
    };
    const fontSizes = getResponsiveFontSizes(containerWidth);
    const width = containerWidth - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const maxLabelWidth = margin.left - 10;

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
      .domain([0, d3.max(data, (d) => d.pct) || 100])
      .range([0, width]);

    const yScale = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.label))
      .range([0, chartHeight])
      .padding(0.3);

    // Create tooltip element (appended to body)
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'tooltip';
    tooltipEl.style.opacity = '0';
    tooltipEl.style.position = 'fixed';
    tooltipEl.style.pointerEvents = 'none';
    tooltipEl.style.zIndex = '9999';
    document.body.appendChild(tooltipEl);

    // Draw bars
    const bars = g.selectAll('.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('y', (d) => yScale(d.label) || 0)
      .attr('height', yScale.bandwidth())
      .attr('x', 0)
      .attr('width', 0)
      .attr('fill', (d) => d.color)
      .attr('rx', 3)
      .style('cursor', 'pointer');

    // Animate bars
    bars
      .transition()
      .duration(600)
      .delay((_, i) => i * 50)
      .ease(d3.easeCubicOut)
      .attr('width', (d) => xScale(d.pct));

    // Category labels (left side)
    g.selectAll('.label-category')
      .data(data)
      .join('text')
      .attr('class', 'label-category')
      .attr('x', -8)
      .attr('y', (d) => (yScale(d.label) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', themeColors.textSecondary)
      .attr('font-size', `${fontSizes.label}px`)
      .text((d) => truncateText(d.label, maxLabelWidth, fontSizes.label));

    // Percentage labels (right side)
    g.selectAll('.label-pct')
      .data(data)
      .join('text')
      .attr('class', 'label-pct')
      .attr('x', width + 8)
      .attr('y', (d) => (yScale(d.label) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', themeColors.textSecondary)
      .attr('font-size', `${fontSizes.axis}px`)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('opacity', 0)
      .text((d) => `${d.pct.toFixed(0)}%`)
      .transition()
      .duration(400)
      .delay((_, i) => 400 + i * 50)
      .attr('opacity', 1);

    // Tooltip interactions
    bars
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 0.8);

        const exampleNames = d.deputyNames?.slice(0, 3).join(', ') || '';
        const moreCount = (d.deputyNames?.length || 0) > 3
          ? ` e +${(d.deputyNames?.length || 0) - 3}`
          : '';

        tooltipEl.innerHTML = `
          <div class="tooltip-title font-semibold">${d.label}</div>
          <div class="space-y-1 mt-2">
            <div class="flex justify-between gap-6">
              <span class="text-text-muted">Deputados:</span>
              <span class="font-mono font-medium">${formatNumber(d.count)}</span>
            </div>
            <div class="flex justify-between gap-6">
              <span class="text-text-muted">% do total:</span>
              <span class="font-mono">${d.pct.toFixed(1)}%</span>
            </div>
            ${d.avgSpending ? `
            <div class="flex justify-between gap-6">
              <span class="text-text-muted">Gasto médio:</span>
              <span class="font-mono text-accent-teal">${formatReais(d.avgSpending, true)}</span>
            </div>
            ` : ''}
          </div>
          ${exampleNames ? `
          <div class="mt-2 pt-2 border-t border-border text-xs text-text-muted">
            Ex: ${exampleNames}${moreCount}
          </div>
          ` : ''}
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
  }, [data, height, themeColors]);

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <p className="text-xs text-text-muted">{subtitle}</p>
      </div>
      <div ref={containerRef} className="chart-container relative">
        <svg ref={svgRef} />
      </div>
    </div>
  );
}
