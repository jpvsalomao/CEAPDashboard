import { useMemo, useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { formatReais, formatNumber } from '../../utils/formatters';

interface RegionalNetworkAnalysisProps {
  deputies: Deputy[];
}

// Brazilian regions and their states
const REGIONS: Record<string, string[]> = {
  Norte: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
  Nordeste: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  'Centro-Oeste': ['DF', 'GO', 'MS', 'MT'],
  Sudeste: ['ES', 'MG', 'RJ', 'SP'],
  Sul: ['PR', 'RS', 'SC'],
};

const STATE_TO_REGION: Record<string, string> = {};
Object.entries(REGIONS).forEach(([region, states]) => {
  states.forEach((state) => {
    STATE_TO_REGION[state] = region;
  });
});

// Region colors
const REGION_COLORS: Record<string, string> = {
  Norte: '#10B981',
  Nordeste: '#F59E0B',
  'Centro-Oeste': '#8B5CF6',
  Sudeste: '#3B82F6',
  Sul: '#EC4899',
};

interface StateStats {
  uf: string;
  region: string;
  deputyCount: number;
  totalSpending: number;
  avgHHI: number;
  suppliers: Set<string>;
}

interface StateConnection {
  state1: string;
  state2: string;
  region1: string;
  region2: string;
  sharedSuppliers: number;
  crossRegion: boolean;
}

export function RegionalNetworkAnalysis({ deputies }: RegionalNetworkAnalysisProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<'network' | 'regions' | 'crossregion'>('network');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // Analyze state and region data
  const { stateStats, regionStats, connections, crossRegionConnections } = useMemo(() => {
    // Build state stats
    const statesMap = new Map<string, StateStats>();

    deputies.forEach((d) => {
      if (!statesMap.has(d.uf)) {
        statesMap.set(d.uf, {
          uf: d.uf,
          region: STATE_TO_REGION[d.uf] || 'Desconhecido',
          deputyCount: 0,
          totalSpending: 0,
          avgHHI: 0,
          suppliers: new Set(),
        });
      }

      const stats = statesMap.get(d.uf)!;
      stats.deputyCount++;
      stats.totalSpending += d.totalSpending;
      stats.avgHHI += d.hhi.value;

      d.topSuppliers.forEach((s) => {
        stats.suppliers.add(s.name.toLowerCase().trim());
      });
    });

    // Calculate averages and build list
    const stateStatsList: StateStats[] = [];
    statesMap.forEach((stats) => {
      if (stats.deputyCount > 0) {
        stats.avgHHI = stats.avgHHI / stats.deputyCount;
        stateStatsList.push(stats);
      }
    });
    stateStatsList.sort((a, b) => b.totalSpending - a.totalSpending);

    // Aggregate by region
    const regionMap = new Map<string, { deputyCount: number; totalSpending: number; avgHHI: number; states: string[] }>();
    stateStatsList.forEach((state) => {
      if (!regionMap.has(state.region)) {
        regionMap.set(state.region, { deputyCount: 0, totalSpending: 0, avgHHI: 0, states: [] });
      }
      const reg = regionMap.get(state.region)!;
      reg.deputyCount += state.deputyCount;
      reg.totalSpending += state.totalSpending;
      reg.avgHHI += state.avgHHI * state.deputyCount;
      reg.states.push(state.uf);
    });

    const regionStatsList: { region: string; deputyCount: number; totalSpending: number; avgHHI: number; states: string[] }[] = [];
    regionMap.forEach((stats, region) => {
      regionStatsList.push({
        region,
        ...stats,
        avgHHI: stats.deputyCount > 0 ? stats.avgHHI / stats.deputyCount : 0,
      });
    });
    regionStatsList.sort((a, b) => b.totalSpending - a.totalSpending);

    // Find connections between states via shared suppliers
    const connectionsList: StateConnection[] = [];
    const states = stateStatsList.map((s) => s.uf);

    for (let i = 0; i < states.length; i++) {
      for (let j = i + 1; j < states.length; j++) {
        const state1Stats = statesMap.get(states[i])!;
        const state2Stats = statesMap.get(states[j])!;

        // Count shared suppliers
        let sharedCount = 0;
        state1Stats.suppliers.forEach((supplier) => {
          if (state2Stats.suppliers.has(supplier)) {
            sharedCount++;
          }
        });

        if (sharedCount >= 5) {
          const crossRegion = state1Stats.region !== state2Stats.region;
          connectionsList.push({
            state1: states[i],
            state2: states[j],
            region1: state1Stats.region,
            region2: state2Stats.region,
            sharedSuppliers: sharedCount,
            crossRegion,
          });
        }
      }
    }

    connectionsList.sort((a, b) => b.sharedSuppliers - a.sharedSuppliers);

    const crossRegion = connectionsList.filter((c) => c.crossRegion);

    return {
      stateStats: stateStatsList,
      regionStats: regionStatsList,
      connections: connectionsList,
      crossRegionConnections: crossRegion,
    };
  }, [deputies]);

  // Network visualization
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || activeView !== 'network' || stateStats.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 400;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);

    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    // Build nodes and links
    interface Node extends d3.SimulationNodeDatum {
      id: string;
      uf: string;
      region: string;
      deputyCount: number;
      totalSpending: number;
    }

    interface Link extends d3.SimulationLinkDatum<Node> {
      source: string | Node;
      target: string | Node;
      sharedCount: number;
      crossRegion: boolean;
    }

    const nodes: Node[] = stateStats.map((s) => ({
      id: s.uf,
      uf: s.uf,
      region: s.region,
      deputyCount: s.deputyCount,
      totalSpending: s.totalSpending,
    }));

    const nodeIds = new Set(nodes.map((n) => n.id));

    const links: Link[] = connections
      .filter((c) => nodeIds.has(c.state1) && nodeIds.has(c.state2))
      .slice(0, 50) // Top 50 connections
      .map((c) => ({
        source: c.state1,
        target: c.state2,
        sharedCount: c.sharedSuppliers,
        crossRegion: c.crossRegion,
      }));

    // Size scale
    const maxSpending = d3.max(nodes, (d) => d.totalSpending) || 1;
    const radiusScale = d3.scaleSqrt().domain([0, maxSpending]).range([12, 35]);

    // Link width scale
    const maxShared = d3.max(links, (d) => d.sharedCount) || 1;
    const linkWidthScale = d3.scaleLinear().domain([5, maxShared]).range([0.5, 5]);

    // Create simulation
    const simulation = d3
      .forceSimulation<Node>(nodes)
      .force(
        'link',
        d3
          .forceLink<Node, Link>(links)
          .id((d) => d.id)
          .distance(80)
      )
      .force('charge', d3.forceManyBody<Node>().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3.forceCollide<Node>().radius((d) => radiusScale(d.totalSpending) + 3)
      );

    const g = svg.append('g');

    // Zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Links
    const link = g
      .append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (d) => (d.crossRegion ? '#F59E0B' : '#4B5563'))
      .attr('stroke-width', (d) => linkWidthScale(d.sharedCount))
      .attr('stroke-opacity', (d) => (d.crossRegion ? 0.8 : 0.4))
      .attr('stroke-dasharray', (d) => (d.crossRegion ? '4,2' : 'none'));

    // Nodes
    const node = g
      .append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, Node>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node circles
    node
      .append('circle')
      .attr('r', (d) => radiusScale(d.totalSpending))
      .attr('fill', (d) => REGION_COLORS[d.region] || '#6B7280')
      .attr('stroke', '#0D0D0F')
      .attr('stroke-width', 2);

    // Node labels
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#FAFAFA')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text((d) => d.uf);

    // Interactions
    node
      .on('mouseenter', function (event, d) {
        d3.select(this).select('circle').attr('stroke-width', 4).attr('stroke', '#FAFAFA');

        const state = stateStats.find((s) => s.uf === d.uf);
        const stateConnections = connections.filter((c) => c.state1 === d.uf || c.state2 === d.uf);

        const content = `
          <div class="tooltip-title">${d.uf} - ${d.region}</div>
          <div class="text-xs text-text-secondary mt-2 space-y-1">
            <div>Deputados: <span class="text-text-primary font-medium">${d.deputyCount}</span></div>
            <div>Total: <span class="text-text-primary font-medium">${formatReais(d.totalSpending, true)}</span></div>
            <div>Fornecedores: <span class="text-text-primary font-medium">${formatNumber(state?.suppliers.size || 0)}</span></div>
            <div>Conexoes: <span class="text-text-primary font-medium">${stateConnections.length}</span></div>
          </div>
        `;

        tooltip
          .style('opacity', 1)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`)
          .html(content);
      })
      .on('mouseleave', function () {
        d3.select(this).select('circle').attr('stroke-width', 2).attr('stroke', '#0D0D0F');
        tooltip.style('opacity', 0);
      })
      .on('click', function (_, d) {
        setSelectedRegion(selectedRegion === d.region ? null : d.region);
      });

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as Node).x || 0)
        .attr('y1', (d) => (d.source as Node).y || 0)
        .attr('x2', (d) => (d.target as Node).x || 0)
        .attr('y2', (d) => (d.target as Node).y || 0);

      node.attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [activeView, stateStats, connections, selectedRegion]);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Analise Regional</h3>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-accent-teal/20 text-accent-teal rounded">
            {formatNumber(stateStats.length)} estados
          </span>
          <span className="px-2 py-1 bg-accent-gold/20 text-accent-gold rounded">
            {formatNumber(crossRegionConnections.length)} inter-regionais
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-border">
        {[
          { id: 'network', label: 'Rede de Estados' },
          { id: 'regions', label: 'Por Regiao' },
          { id: 'crossregion', label: 'Inter-Regional' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as typeof activeView)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeView === tab.id
                ? 'text-accent-teal border-b-2 border-accent-teal -mb-px'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Network View */}
      {activeView === 'network' && (
        <div ref={containerRef} className="relative" style={{ height: 400 }}>
          <svg ref={svgRef} className="w-full h-full" />
          <div ref={tooltipRef} className="tooltip" style={{ opacity: 0 }} />

          {/* Legend */}
          <div className="absolute bottom-2 left-2 bg-bg-card-solid/90 p-2 rounded text-xs">
            <p className="text-text-muted mb-2">Regioes:</p>
            <div className="grid grid-cols-3 gap-x-3 gap-y-1">
              {Object.entries(REGION_COLORS).map(([region, color]) => (
                <div key={region} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-text-secondary">{region}</span>
                </div>
              ))}
            </div>
            <p className="text-text-muted mt-2 border-t border-border pt-2">
              <span className="text-accent-gold">- - -</span> = Inter-regional
            </p>
          </div>

          {/* Region filter */}
          {selectedRegion && (
            <div className="absolute top-2 right-2 bg-bg-card-solid px-3 py-2 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: REGION_COLORS[selectedRegion] }}
                />
                <span className="text-sm text-text-primary">{selectedRegion}</span>
                <button
                  onClick={() => setSelectedRegion(null)}
                  className="text-text-muted hover:text-text-primary ml-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Regions View */}
      {activeView === 'regions' && (
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {regionStats.map((r) => (
            <div
              key={r.region}
              className={`p-4 rounded-lg border-l-4 ${
                selectedRegion === r.region ? 'bg-bg-card' : 'bg-bg-secondary'
              }`}
              style={{ borderLeftColor: REGION_COLORS[r.region] }}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-text-primary">{r.region}</h4>
                <span className="text-xs text-text-muted">{r.states.join(', ')}</span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-text-muted text-xs">Deputados</p>
                  <p className="font-medium text-text-primary">{r.deputyCount}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs">Gasto Total</p>
                  <p className="font-medium text-text-primary">{formatReais(r.totalSpending, true)}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs">HHI Medio</p>
                  <p className="font-medium text-text-primary">{formatNumber(Math.round(r.avgHHI))}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs">Estados</p>
                  <p className="font-medium text-text-primary">{r.states.length}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cross-Region View */}
      {activeView === 'crossregion' && (
        <div className="max-h-[400px] overflow-y-auto">
          {crossRegionConnections.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">
              Nenhuma conexao inter-regional significativa encontrada.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-bg-secondary">
                <tr>
                  <th className="text-left p-2 text-text-muted font-medium">Estado 1</th>
                  <th className="text-left p-2 text-text-muted font-medium">Estado 2</th>
                  <th className="text-right p-2 text-text-muted font-medium">Fornecedores</th>
                </tr>
              </thead>
              <tbody>
                {crossRegionConnections.slice(0, 15).map((c, idx) => (
                  <tr key={idx} className="border-t border-border hover:bg-bg-secondary">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: REGION_COLORS[c.region1] }}
                        />
                        <span className="font-medium text-text-primary">{c.state1}</span>
                        <span className="text-xs text-text-muted">({c.region1})</span>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: REGION_COLORS[c.region2] }}
                        />
                        <span className="font-medium text-text-primary">{c.state2}</span>
                        <span className="text-xs text-text-muted">({c.region2})</span>
                      </div>
                    </td>
                    <td className="p-2 text-right">
                      <span
                        className={`font-mono ${
                          c.sharedSuppliers >= 30
                            ? 'text-risk-critical'
                            : c.sharedSuppliers >= 15
                            ? 'text-risk-high'
                            : 'text-text-primary'
                        }`}
                      >
                        {c.sharedSuppliers}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {crossRegionConnections.length > 15 && (
            <p className="text-center text-xs text-text-muted py-2">
              Mostrando top 15 de {crossRegionConnections.length} conexoes inter-regionais
            </p>
          )}
        </div>
      )}

      {/* Insight */}
      {crossRegionConnections.length > 0 && crossRegionConnections[0].sharedSuppliers >= 20 && (
        <div className="mt-4 p-3 bg-accent-gold/10 border border-accent-gold/30 rounded-lg">
          <p className="text-sm text-accent-gold">
            <span className="font-bold">{crossRegionConnections[0].state1}</span> ({crossRegionConnections[0].region1}) e{' '}
            <span className="font-bold">{crossRegionConnections[0].state2}</span> ({crossRegionConnections[0].region2})
            compartilham <span className="font-bold">{crossRegionConnections[0].sharedSuppliers}</span> fornecedores,
            indicando conexoes inter-regionais significativas.
          </p>
        </div>
      )}
    </div>
  );
}
