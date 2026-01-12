import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { formatReais, formatPercent } from '../../utils/formatters';
import { getRiskLevelColor } from '../../utils/colors';

interface SimilarityMatrixProps {
  deputies: Deputy[];
  height?: number;
  maxDeputies?: number;
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

export function SimilarityMatrix({
  deputies,
  height = 600,
  maxDeputies = 30,
}: SimilarityMatrixProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [selectedPair, setSelectedPair] = useState<{ d1: Deputy; d2: Deputy; similarity: number } | null>(null);

  // Category list for spending vector
  const CATEGORIES = [
    'COMBUSTIVEIS E LUBRIFICANTES',
    'LOCACAO OU FRETAMENTO DE VEICULOS AUTOMOTORES',
    'DIVULGACAO DA ATIVIDADE PARLAMENTAR',
    'PASSAGENS AEREAS',
    'TELEFONIA',
    'SERVICOS POSTAIS',
    'MANUTENCAO DE ESCRITORIO DE APOIO A ATIVIDADE PARLAMENTAR',
    'CONSULTORIAS, PESQUISAS E TRABALHOS TECNICOS',
    'HOSPEDAGEM',
    'ALIMENTACAO DO PARLAMENTAR',
  ];

  // Get spending vector for a deputy (normalized by category)
  const getSpendingVector = useCallback((deputy: Deputy): number[] => {
    return CATEGORIES.map(cat => {
      const categoryData = deputy.byCategory?.find((c: { category: string; value: number }) => c.category === cat);
      return categoryData?.value ?? 0;
    });
  }, []);

  // Process deputies and calculate similarity matrix
  const { processedDeputies, similarityData, topSimilarPairs } = useMemo(() => {
    // Filter valid deputies
    const validDeputies = deputies
      .filter(d => !d.name.includes('LIDERANCA') && d.transactionCount > 10)
      .sort((a, b) => b.totalSpending - a.totalSpending)
      .slice(0, maxDeputies);

    // Calculate similarity matrix
    const matrix: number[][] = [];
    const pairs: { d1: Deputy; d2: Deputy; similarity: number }[] = [];

    for (let i = 0; i < validDeputies.length; i++) {
      matrix[i] = [];
      const vecA = getSpendingVector(validDeputies[i]);

      for (let j = 0; j < validDeputies.length; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else if (j < i) {
          matrix[i][j] = matrix[j][i];
        } else {
          const vecB = getSpendingVector(validDeputies[j]);
          const sim = cosineSimilarity(vecA, vecB);
          matrix[i][j] = sim;

          pairs.push({
            d1: validDeputies[i],
            d2: validDeputies[j],
            similarity: sim,
          });
        }
      }
    }

    // Get top similar pairs (excluding very low similarities)
    const topPairs = pairs
      .filter(p => p.similarity > 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20);

    return {
      processedDeputies: validDeputies,
      similarityData: matrix,
      topSimilarPairs: topPairs,
    };
  }, [deputies, maxDeputies, getSpendingVector]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || processedDeputies.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);

    svg.selectAll('*').remove();

    const margin = { top: 100, right: 20, bottom: 20, left: 100 };
    const matrixWidth = width - margin.left - margin.right;
    const matrixHeight = height - margin.top - margin.bottom;
    const cellSize = Math.min(matrixWidth, matrixHeight) / processedDeputies.length;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Color scale for similarity
    const colorScale = d3.scaleSequential()
      .domain([0, 1])
      .interpolator(d3.interpolateRdYlGn);

    // Create cells
    for (let i = 0; i < processedDeputies.length; i++) {
      for (let j = 0; j < processedDeputies.length; j++) {
        const similarity = similarityData[i][j];

        g.append('rect')
          .attr('x', j * cellSize)
          .attr('y', i * cellSize)
          .attr('width', cellSize - 1)
          .attr('height', cellSize - 1)
          .attr('fill', i === j ? '#2a2b33' : colorScale(similarity))
          .attr('rx', 2)
          .attr('cursor', i !== j ? 'pointer' : 'default')
          .on('mouseenter', function(event) {
            if (i === j) return;

            d3.select(this)
              .attr('stroke', '#fff')
              .attr('stroke-width', 2);

            tooltip
              .style('opacity', 1)
              .style('left', `${event.pageX - container.getBoundingClientRect().left + 10}px`)
              .style('top', `${event.pageY - container.getBoundingClientRect().top - 10}px`)
              .html(`
                <div class="tooltip-title">${processedDeputies[i].name}</div>
                <div class="tooltip-label">${processedDeputies[i].party}-${processedDeputies[i].uf}</div>
                <div style="margin: 8px 0; border-top: 1px solid #3a3b45; padding-top: 8px;">
                  <div class="tooltip-title">${processedDeputies[j].name}</div>
                  <div class="tooltip-label">${processedDeputies[j].party}-${processedDeputies[j].uf}</div>
                </div>
                <div style="margin-top: 8px;">
                  <div class="tooltip-value">${formatPercent(similarity * 100)}</div>
                  <div class="tooltip-label">Similaridade</div>
                </div>
              `);
          })
          .on('mousemove', function(event) {
            tooltip
              .style('left', `${event.pageX - container.getBoundingClientRect().left + 10}px`)
              .style('top', `${event.pageY - container.getBoundingClientRect().top - 10}px`);
          })
          .on('mouseleave', function() {
            d3.select(this)
              .attr('stroke', 'none');
            tooltip.style('opacity', 0);
          })
          .on('click', () => {
            if (i !== j) {
              setSelectedPair({
                d1: processedDeputies[i],
                d2: processedDeputies[j],
                similarity: similarityData[i][j],
              });
            }
          });
      }
    }

    // Row labels (deputy names)
    g.selectAll('.row-label')
      .data(processedDeputies)
      .join('text')
      .attr('class', 'row-label')
      .attr('x', -5)
      .attr('y', (_, i) => i * cellSize + cellSize / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#A0A3B1')
      .attr('font-size', '9px')
      .text(d => d.name.split(' ').slice(0, 2).join(' ').substring(0, 12));

    // Column labels (deputy names rotated)
    g.selectAll('.col-label')
      .data(processedDeputies)
      .join('text')
      .attr('class', 'col-label')
      .attr('transform', (_, i) => `translate(${i * cellSize + cellSize / 2}, -5) rotate(-45)`)
      .attr('text-anchor', 'start')
      .attr('fill', '#A0A3B1')
      .attr('font-size', '9px')
      .text(d => d.name.split(' ').slice(0, 2).join(' ').substring(0, 12));

    // Legend
    const legendWidth = 150;
    const legendHeight = 10;
    const legendX = width - legendWidth - 30;
    const legendY = 30;

    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'similarity-gradient');

    const gradientStops = d3.range(0, 1.01, 0.1);
    gradientStops.forEach(t => {
      gradient.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', colorScale(t));
    });

    svg.append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'url(#similarity-gradient)')
      .attr('rx', 2);

    svg.append('text')
      .attr('x', legendX)
      .attr('y', legendY - 5)
      .attr('fill', '#A0A3B1')
      .attr('font-size', '10px')
      .text('0%');

    svg.append('text')
      .attr('x', legendX + legendWidth)
      .attr('y', legendY - 5)
      .attr('fill', '#A0A3B1')
      .attr('font-size', '10px')
      .attr('text-anchor', 'end')
      .text('100%');

    svg.append('text')
      .attr('x', legendX + legendWidth / 2)
      .attr('y', legendY + legendHeight + 15)
      .attr('fill', '#A0A3B1')
      .attr('font-size', '11px')
      .attr('text-anchor', 'middle')
      .text('Similaridade');

  }, [processedDeputies, similarityData, height]);

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Matriz de Similaridade
          </h3>
          <p className="text-sm text-text-muted">
            Similaridade baseada no perfil de gastos por categoria
          </p>
        </div>
        <div className="text-xs text-text-muted">
          {processedDeputies.length} deputados analisados
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Matrix */}
        <div className="lg:col-span-2">
          <div ref={containerRef} className="relative overflow-x-auto">
            <svg
              ref={svgRef}
              width="100%"
              height={height}
              className="overflow-visible"
            />
            <div
              ref={tooltipRef}
              className="tooltip"
              style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
            />
          </div>
        </div>

        {/* Top Similar Pairs */}
        <div className="bg-bg-secondary rounded-lg p-4">
          <h4 className="text-sm font-semibold text-text-primary mb-3">
            Pares Mais Similares
          </h4>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {topSimilarPairs.map((pair, i) => (
              <button
                key={i}
                onClick={() => setSelectedPair(pair)}
                className={`w-full text-left p-2 rounded-lg transition ${
                  selectedPair?.d1.id === pair.d1.id && selectedPair?.d2.id === pair.d2.id
                    ? 'bg-accent-teal/20 border border-accent-teal'
                    : 'bg-bg-card hover:bg-bg-card/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-primary truncate">
                      {pair.d1.name.split(' ').slice(0, 2).join(' ')}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {pair.d2.name.split(' ').slice(0, 2).join(' ')}
                    </p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-sm font-bold text-accent-teal">
                      {formatPercent(pair.similarity * 100)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
            {topSimilarPairs.length === 0 && (
              <p className="text-xs text-text-muted text-center py-4">
                Nenhum par com similaridade alta encontrado
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Selected Pair Details */}
      {selectedPair && (
        <div className="mt-6 p-4 bg-bg-secondary rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-text-primary">
              Comparacao Detalhada
            </h4>
            <button
              onClick={() => setSelectedPair(null)}
              className="text-text-muted hover:text-text-primary text-sm"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Deputy 1 */}
            <div className="p-3 bg-bg-card rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getRiskLevelColor(selectedPair.d1.riskLevel) }}
                />
                <span className="text-sm font-semibold text-text-primary">
                  {selectedPair.d1.name}
                </span>
              </div>
              <p className="text-xs text-text-muted mb-2">
                {selectedPair.d1.party}-{selectedPair.d1.uf}
              </p>
              <p className="text-lg font-bold text-accent-teal">
                {formatReais(selectedPair.d1.totalSpending, true)}
              </p>
            </div>

            {/* Deputy 2 */}
            <div className="p-3 bg-bg-card rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getRiskLevelColor(selectedPair.d2.riskLevel) }}
                />
                <span className="text-sm font-semibold text-text-primary">
                  {selectedPair.d2.name}
                </span>
              </div>
              <p className="text-xs text-text-muted mb-2">
                {selectedPair.d2.party}-{selectedPair.d2.uf}
              </p>
              <p className="text-lg font-bold text-accent-teal">
                {formatReais(selectedPair.d2.totalSpending, true)}
              </p>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-2xl font-bold text-accent-teal">
              {formatPercent(selectedPair.similarity * 100)}
            </p>
            <p className="text-xs text-text-muted">
              Similaridade no perfil de gastos
            </p>
          </div>
        </div>
      )}

      {/* Methodology note */}
      <div className="mt-4 p-3 bg-bg-card border border-border rounded-lg">
        <p className="text-xs text-text-muted">
          <span className="font-medium text-text-secondary">Metodologia:</span>{' '}
          Similaridade calculada via cosseno dos vetores de gastos por categoria.
          Valores proximos a 100% indicam padroes de gastos muito similares.
        </p>
      </div>
    </div>
  );
}
