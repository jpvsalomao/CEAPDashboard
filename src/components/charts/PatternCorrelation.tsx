import { useMemo, useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';

interface PatternCorrelationProps {
  deputies: Deputy[];
  height?: number;
}

interface MetricData {
  id: string;
  label: string;
  getValue: (d: Deputy) => number;
}

const METRICS: MetricData[] = [
  { id: 'hhi', label: 'HHI', getValue: (d) => d.hhi.value },
  { id: 'benford', label: 'Benford', getValue: (d) => d.benford?.chi2 ?? 0 },
  { id: 'round', label: 'Redondos %', getValue: (d) => d.roundValuePct ?? 0 },
  { id: 'avgTicket', label: 'Ticket Médio', getValue: (d) => d.avgTicket ?? 0 },
  { id: 'txCount', label: 'Transações', getValue: (d) => d.transactionCount ?? 0 },
  { id: 'suppliers', label: 'Fornecedores', getValue: (d) => d.supplierCount ?? 0 },
  { id: 'attendance', label: 'Presença %', getValue: (d) => d.attendance?.rate ?? 0 },
  { id: 'mandates', label: 'Mandatos', getValue: (d) => d.mandateCount ?? 1 },
];

// Calculate Pearson correlation coefficient
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

export function PatternCorrelation({ deputies, height = 400 }: PatternCorrelationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedPair, setSelectedPair] = useState<[string, string] | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height });

  // Calculate correlation matrix
  const correlationMatrix = useMemo(() => {
    const matrix: { row: string; col: string; value: number }[] = [];
    const metricValues: Record<string, number[]> = {};

    // Extract values for each metric
    METRICS.forEach((metric) => {
      metricValues[metric.id] = deputies.map((d) => metric.getValue(d));
    });

    // Calculate correlations
    METRICS.forEach((rowMetric) => {
      METRICS.forEach((colMetric) => {
        const correlation = pearsonCorrelation(
          metricValues[rowMetric.id],
          metricValues[colMetric.id]
        );
        matrix.push({
          row: rowMetric.id,
          col: colMetric.id,
          value: correlation,
        });
      });
    });

    return matrix;
  }, [deputies]);

  // Find strong correlations (excluding self-correlations)
  const strongCorrelations = useMemo(() => {
    return correlationMatrix
      .filter((c) => c.row !== c.col && Math.abs(c.value) > 0.3)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 6);
  }, [correlationMatrix]);

  // Calculate scatter data for selected pair
  const scatterData = useMemo(() => {
    if (!selectedPair) return [];

    const [xId, yId] = selectedPair;
    const xMetric = METRICS.find((m) => m.id === xId);
    const yMetric = METRICS.find((m) => m.id === yId);

    if (!xMetric || !yMetric) return [];

    return deputies.map((d) => ({
      x: xMetric.getValue(d),
      y: yMetric.getValue(d),
      name: d.name,
      party: d.party,
      riskLevel: d.riskLevel,
    }));
  }, [deputies, selectedPair]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height,
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [height]);

  // Draw heatmap
  useEffect(() => {
    if (!svgRef.current || correlationMatrix.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 20, bottom: 20, left: 80 };
    const cellSize = Math.min(
      (dimensions.width - margin.left - margin.right) / METRICS.length,
      50
    );

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Color scale for correlations
    const colorScale = d3
      .scaleLinear<string>()
      .domain([-1, 0, 1])
      .range(['#DC4A4A', '#1A1A1F', '#4AA3A0']);

    // X axis labels
    g.selectAll('.x-label')
      .data(METRICS)
      .enter()
      .append('text')
      .attr('class', 'x-label')
      .attr('x', (_, i) => i * cellSize + cellSize / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#9CA3AF')
      .attr('font-size', '10px')
      .text((d) => d.label);

    // Y axis labels
    g.selectAll('.y-label')
      .data(METRICS)
      .enter()
      .append('text')
      .attr('class', 'y-label')
      .attr('x', -10)
      .attr('y', (_, i) => i * cellSize + cellSize / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#9CA3AF')
      .attr('font-size', '10px')
      .text((d) => d.label);

    // Create tooltip
    const tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'correlation-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(13, 13, 15, 0.95)')
      .style('border', '1px solid rgba(74, 163, 160, 0.3)')
      .style('border-radius', '8px')
      .style('padding', '8px 12px')
      .style('font-size', '12px')
      .style('color', '#F9FAFB')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000);

    // Draw cells
    g.selectAll('.cell')
      .data(correlationMatrix)
      .enter()
      .append('rect')
      .attr('class', 'cell')
      .attr('x', (d) => METRICS.findIndex((m) => m.id === d.col) * cellSize)
      .attr('y', (d) => METRICS.findIndex((m) => m.id === d.row) * cellSize)
      .attr('width', cellSize - 2)
      .attr('height', cellSize - 2)
      .attr('rx', 4)
      .attr('fill', (d) => colorScale(d.value))
      .attr('opacity', (d) => (d.row === d.col ? 0.3 : 0.8))
      .attr('cursor', (d) => (d.row !== d.col ? 'pointer' : 'default'))
      .on('mouseover', function (event, d) {
        if (d.row === d.col) return;

        const rowLabel = METRICS.find((m) => m.id === d.row)?.label;
        const colLabel = METRICS.find((m) => m.id === d.col)?.label;

        d3.select(this).attr('stroke', '#4AA3A0').attr('stroke-width', 2);

        tooltip
          .style('opacity', 1)
          .html(
            `<div style="font-weight: 600;">${rowLabel} × ${colLabel}</div>
             <div style="margin-top: 4px;">
               Correlação: <span style="color: ${d.value > 0 ? '#4AA3A0' : '#DC4A4A'}; font-weight: 600;">
                 ${d.value > 0 ? '+' : ''}${d.value.toFixed(3)}
               </span>
             </div>
             <div style="margin-top: 4px; font-size: 10px; color: #6B7280;">
               Clique para ver scatter plot
             </div>`
          )
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`);
      })
      .on('mouseout', function (_, d) {
        if (d.row === d.col) return;
        d3.select(this).attr('stroke', 'none');
        tooltip.style('opacity', 0);
      })
      .on('click', (_, d) => {
        if (d.row !== d.col) {
          setSelectedPair([d.col, d.row]);
        }
      });

    // Add correlation values as text
    g.selectAll('.value')
      .data(correlationMatrix)
      .enter()
      .append('text')
      .attr('class', 'value')
      .attr('x', (d) => METRICS.findIndex((m) => m.id === d.col) * cellSize + cellSize / 2)
      .attr('y', (d) => METRICS.findIndex((m) => m.id === d.row) * cellSize + cellSize / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', (d) => (Math.abs(d.value) > 0.5 ? '#F9FAFB' : '#9CA3AF'))
      .attr('font-size', '10px')
      .attr('font-weight', (d) => (Math.abs(d.value) > 0.3 ? '600' : '400'))
      .attr('pointer-events', 'none')
      .text((d) => (d.row === d.col ? '' : d.value.toFixed(2)));

    // Clean up tooltip on unmount
    return () => {
      tooltip.remove();
    };
  }, [correlationMatrix, dimensions]);

  // Draw scatter plot when pair is selected
  useEffect(() => {
    if (!selectedPair || scatterData.length === 0) return;

    // Remove any existing scatter tooltip
    d3.select('.scatter-tooltip').remove();
  }, [selectedPair, scatterData]);

  const riskColors: Record<string, string> = {
    CRITICO: '#DC4A4A',
    ALTO: '#E5A84B',
    MEDIO: '#4AA3A0',
    BAIXO: '#2ECC71',
  };

  return (
    <div className="space-y-6">
      {/* Heatmap */}
      <div ref={containerRef} className="w-full">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={METRICS.length * 50 + 60}
          className="overflow-visible"
        />
      </div>

      {/* Color Legend */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#DC4A4A' }} />
          <span className="text-text-muted">Correlação negativa</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#1A1A1F', border: '1px solid #3B3B40' }} />
          <span className="text-text-muted">Sem correlação</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#4AA3A0' }} />
          <span className="text-text-muted">Correlação positiva</span>
        </div>
      </div>

      {/* Strong Correlations List */}
      {strongCorrelations.length > 0 && (
        <div className="bg-bg-secondary p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-text-primary mb-3">
            Correlações Relevantes (|r| &gt; 0.3)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {strongCorrelations.map((corr, idx) => {
              const rowLabel = METRICS.find((m) => m.id === corr.row)?.label;
              const colLabel = METRICS.find((m) => m.id === corr.col)?.label;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedPair([corr.col, corr.row])}
                  className="flex items-center justify-between p-2 bg-bg-card rounded hover:bg-bg-primary transition-colors text-left"
                >
                  <span className="text-sm text-text-secondary">
                    {rowLabel} × {colLabel}
                  </span>
                  <span
                    className={`font-mono text-sm font-semibold ${
                      corr.value > 0 ? 'text-accent-teal' : 'text-risk-critical'
                    }`}
                  >
                    {corr.value > 0 ? '+' : ''}
                    {corr.value.toFixed(3)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Scatter Plot for Selected Pair */}
      {selectedPair && scatterData.length > 0 && (
        <div className="bg-bg-secondary p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-text-primary">
              {METRICS.find((m) => m.id === selectedPair[0])?.label} ×{' '}
              {METRICS.find((m) => m.id === selectedPair[1])?.label}
            </h4>
            <button
              onClick={() => setSelectedPair(null)}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              Fechar
            </button>
          </div>
          <div className="relative h-64">
            <svg className="w-full h-full">
              {(() => {
                const margin = { top: 20, right: 20, bottom: 30, left: 50 };
                const width = dimensions.width - margin.left - margin.right;
                const plotHeight = 256 - margin.top - margin.bottom;

                const xExtent = d3.extent(scatterData, (d) => d.x) as [number, number];
                const yExtent = d3.extent(scatterData, (d) => d.y) as [number, number];

                const xScale = d3.scaleLinear().domain(xExtent).range([0, width]).nice();
                const yScale = d3.scaleLinear().domain(yExtent).range([plotHeight, 0]).nice();

                return (
                  <g transform={`translate(${margin.left},${margin.top})`}>
                    {/* X axis */}
                    <g transform={`translate(0,${plotHeight})`}>
                      <line x1={0} x2={width} y1={0} y2={0} stroke="#3B3B40" />
                      <text
                        x={width / 2}
                        y={25}
                        textAnchor="middle"
                        fill="#6B7280"
                        fontSize={10}
                      >
                        {METRICS.find((m) => m.id === selectedPair[0])?.label}
                      </text>
                    </g>
                    {/* Y axis */}
                    <g>
                      <line x1={0} x2={0} y1={0} y2={plotHeight} stroke="#3B3B40" />
                      <text
                        x={-plotHeight / 2}
                        y={-35}
                        textAnchor="middle"
                        fill="#6B7280"
                        fontSize={10}
                        transform="rotate(-90)"
                      >
                        {METRICS.find((m) => m.id === selectedPair[1])?.label}
                      </text>
                    </g>
                    {/* Points */}
                    {scatterData.map((point, idx) => (
                      <circle
                        key={idx}
                        cx={xScale(point.x)}
                        cy={yScale(point.y)}
                        r={4}
                        fill={riskColors[point.riskLevel] || '#4AA3A0'}
                        opacity={0.7}
                      >
                        <title>
                          {point.name} ({point.party})
                        </title>
                      </circle>
                    ))}
                  </g>
                );
              })()}
            </svg>
          </div>
          {/* Risk level legend */}
          <div className="flex items-center justify-center gap-4 mt-2 text-xs">
            {Object.entries(riskColors).map(([level, color]) => (
              <div key={level} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-text-muted">{level}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interpretation Guide */}
      <div className="text-xs text-text-muted p-3 bg-bg-card rounded-lg">
        <p className="font-medium text-text-secondary mb-1">Como interpretar:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Correlação positiva (+)</strong>: Quando um indicador sobe, o outro tende a subir
          </li>
          <li>
            <strong>Correlação negativa (-)</strong>: Quando um sobe, o outro tende a descer
          </li>
          <li>
            <strong>|r| &gt; 0.3</strong>: Correlação relevante
          </li>
          <li>
            <strong>|r| &gt; 0.7</strong>: Correlação forte
          </li>
        </ul>
      </div>
    </div>
  );
}
