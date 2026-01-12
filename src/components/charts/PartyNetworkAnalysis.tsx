import { useMemo, useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { formatReais, formatNumber } from '../../utils/formatters';

interface PartyNetworkAnalysisProps {
  deputies: Deputy[];
}

interface PartyStats {
  party: string;
  deputyCount: number;
  totalSpending: number;
  avgHHI: number;
  suppliers: Set<string>;
}

interface PartyConnection {
  party1: string;
  party2: string;
  sharedSuppliers: string[];
  totalValue: number;
}

// Party colors (Brazilian political parties)
const PARTY_COLORS: Record<string, string> = {
  PT: '#E31D1D',
  PL: '#1E3A8A',
  UNIÃO: '#2563EB',
  PP: '#3B82F6',
  MDB: '#22C55E',
  PSD: '#F59E0B',
  REPUBLICANOS: '#6366F1',
  PSDB: '#0EA5E9',
  PDT: '#DC2626',
  PODE: '#8B5CF6',
  PSB: '#F97316',
  PSOL: '#FBBF24',
  AVANTE: '#14B8A6',
  PCdoB: '#EF4444',
  CIDADANIA: '#EC4899',
  SOLIDARIEDADE: '#F43F5E',
  PV: '#10B981',
  NOVO: '#F97316',
  REDE: '#06B6D4',
  PRD: '#A855F7',
};

const getPartyColor = (party: string): string => {
  return PARTY_COLORS[party] || '#6B7280';
};

export function PartyNetworkAnalysis({ deputies }: PartyNetworkAnalysisProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<'network' | 'table' | 'stats'>('network');
  const [selectedParty, setSelectedParty] = useState<string | null>(null);

  // Analyze party data
  const { partyStats, connections, topConnections } = useMemo(() => {
    // Build party stats
    const statsMap = new Map<string, PartyStats>();

    deputies.forEach((d) => {
      if (!statsMap.has(d.party)) {
        statsMap.set(d.party, {
          party: d.party,
          deputyCount: 0,
          totalSpending: 0,
          avgHHI: 0,
          suppliers: new Set(),
        });
      }

      const stats = statsMap.get(d.party)!;
      stats.deputyCount++;
      stats.totalSpending += d.totalSpending;
      stats.avgHHI += d.hhi.value;

      // Add top suppliers
      d.topSuppliers.forEach((s) => {
        stats.suppliers.add(s.name.toLowerCase().trim());
      });
    });

    // Calculate averages
    const partyStatsList: PartyStats[] = [];
    statsMap.forEach((stats) => {
      stats.avgHHI = stats.avgHHI / stats.deputyCount;
      partyStatsList.push(stats);
    });

    // Sort by total spending
    partyStatsList.sort((a, b) => b.totalSpending - a.totalSpending);

    // Find connections between parties via shared suppliers
    const connectionsList: PartyConnection[] = [];
    const parties = partyStatsList.map((p) => p.party);

    for (let i = 0; i < parties.length; i++) {
      for (let j = i + 1; j < parties.length; j++) {
        const party1Stats = statsMap.get(parties[i])!;
        const party2Stats = statsMap.get(parties[j])!;

        // Find shared suppliers
        const shared: string[] = [];
        party1Stats.suppliers.forEach((supplier) => {
          if (party2Stats.suppliers.has(supplier)) {
            shared.push(supplier);
          }
        });

        if (shared.length >= 3) {
          // Only show connections with 3+ shared suppliers
          connectionsList.push({
            party1: parties[i],
            party2: parties[j],
            sharedSuppliers: shared,
            totalValue: party1Stats.totalSpending + party2Stats.totalSpending,
          });
        }
      }
    }

    // Sort connections by number of shared suppliers
    connectionsList.sort((a, b) => b.sharedSuppliers.length - a.sharedSuppliers.length);

    return {
      partyStats: partyStatsList,
      connections: connectionsList,
      topConnections: connectionsList.slice(0, 10),
    };
  }, [deputies]);

  // Network visualization
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || activeView !== 'network' || partyStats.length === 0) return;

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
      party: string;
      deputyCount: number;
      totalSpending: number;
      avgHHI: number;
      supplierCount: number;
    }

    interface Link extends d3.SimulationLinkDatum<Node> {
      source: string | Node;
      target: string | Node;
      sharedCount: number;
    }

    const nodes: Node[] = partyStats.slice(0, 15).map((p) => ({
      id: p.party,
      party: p.party,
      deputyCount: p.deputyCount,
      totalSpending: p.totalSpending,
      avgHHI: p.avgHHI,
      supplierCount: p.suppliers.size,
    }));

    const nodeIds = new Set(nodes.map((n) => n.id));

    const links: Link[] = connections
      .filter((c) => nodeIds.has(c.party1) && nodeIds.has(c.party2))
      .map((c) => ({
        source: c.party1,
        target: c.party2,
        sharedCount: c.sharedSuppliers.length,
      }));

    // Size scale based on total spending
    const maxSpending = d3.max(nodes, (d) => d.totalSpending) || 1;
    const radiusScale = d3.scaleSqrt().domain([0, maxSpending]).range([15, 40]);

    // Link width scale
    const maxShared = d3.max(links, (d) => d.sharedCount) || 1;
    const linkWidthScale = d3.scaleLinear().domain([3, maxShared]).range([1, 8]);

    // Create simulation
    const simulation = d3
      .forceSimulation<Node>(nodes)
      .force(
        'link',
        d3
          .forceLink<Node, Link>(links)
          .id((d) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody<Node>().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3.forceCollide<Node>().radius((d) => radiusScale(d.totalSpending) + 5)
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
      .attr('stroke', '#4B5563')
      .attr('stroke-width', (d) => linkWidthScale(d.sharedCount))
      .attr('stroke-opacity', 0.6);

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
      .attr('fill', (d) => getPartyColor(d.party))
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
      .text((d) => d.party);

    // Interactions
    node
      .on('mouseenter', function (event, d) {
        d3.select(this).select('circle').attr('stroke-width', 4).attr('stroke', '#FAFAFA');

        // Highlight connected nodes
        const connectedParties = new Set<string>();
        links.forEach((l) => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          if (sourceId === d.id) connectedParties.add(targetId);
          if (targetId === d.id) connectedParties.add(sourceId);
        });

        node.select('circle').attr('opacity', (n) => (n.id === d.id || connectedParties.has(n.id) ? 1 : 0.3));
        link.attr('opacity', (l) => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          return sourceId === d.id || targetId === d.id ? 1 : 0.1;
        });

        const content = `
          <div class="tooltip-title">${d.party}</div>
          <div class="text-xs text-text-secondary mt-2 space-y-1">
            <div>Deputados: <span class="text-text-primary font-medium">${d.deputyCount}</span></div>
            <div>Total: <span class="text-text-primary font-medium">${formatReais(d.totalSpending, true)}</span></div>
            <div>HHI medio: <span class="text-text-primary font-medium">${formatNumber(Math.round(d.avgHHI))}</span></div>
            <div>Fornecedores: <span class="text-text-primary font-medium">${formatNumber(d.supplierCount)}</span></div>
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
        node.select('circle').attr('opacity', 1);
        link.attr('opacity', 0.6);
        tooltip.style('opacity', 0);
      })
      .on('click', function (_, d) {
        setSelectedParty(selectedParty === d.party ? null : d.party);
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
  }, [activeView, partyStats, connections, selectedParty]);

  // Get connections for selected party
  const selectedConnections = useMemo(() => {
    if (!selectedParty) return [];
    return connections.filter((c) => c.party1 === selectedParty || c.party2 === selectedParty);
  }, [selectedParty, connections]);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Analise por Partido</h3>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-accent-teal/20 text-accent-teal rounded">
            {formatNumber(partyStats.length)} partidos
          </span>
          <span className="px-2 py-1 bg-accent-gold/20 text-accent-gold rounded">
            {formatNumber(connections.length)} conexoes
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-border">
        {[
          { id: 'network', label: 'Rede de Partidos' },
          { id: 'table', label: 'Conexoes' },
          { id: 'stats', label: 'Estatisticas' },
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
            <p className="text-text-muted mb-1">Tamanho = Gasto total</p>
            <p className="text-text-muted">Linha = Fornecedores compartilhados</p>
          </div>

          {/* Selected party info */}
          {selectedParty && (
            <div className="absolute top-2 right-2 w-48 bg-bg-card-solid p-3 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <span
                  className="px-2 py-1 rounded text-sm font-bold text-white"
                  style={{ backgroundColor: getPartyColor(selectedParty) }}
                >
                  {selectedParty}
                </span>
                <button onClick={() => setSelectedParty(null)} className="text-text-muted hover:text-text-primary">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-text-muted mb-2">{selectedConnections.length} conexoes com outros partidos</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {selectedConnections.slice(0, 5).map((c) => {
                  const otherParty = c.party1 === selectedParty ? c.party2 : c.party1;
                  return (
                    <div key={`${c.party1}-${c.party2}`} className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">{otherParty}</span>
                      <span className="text-accent-teal">{c.sharedSuppliers.length} fornec.</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Connections Table */}
      {activeView === 'table' && (
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bg-secondary">
              <tr>
                <th className="text-left p-2 text-text-muted font-medium">Partido 1</th>
                <th className="text-left p-2 text-text-muted font-medium">Partido 2</th>
                <th className="text-right p-2 text-text-muted font-medium">Fornecedores</th>
              </tr>
            </thead>
            <tbody>
              {topConnections.map((c) => (
                <tr key={`${c.party1}-${c.party2}`} className="border-t border-border hover:bg-bg-secondary">
                  <td className="p-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold text-white"
                      style={{ backgroundColor: getPartyColor(c.party1) }}
                    >
                      {c.party1}
                    </span>
                  </td>
                  <td className="p-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold text-white"
                      style={{ backgroundColor: getPartyColor(c.party2) }}
                    >
                      {c.party2}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    <span
                      className={`font-mono ${
                        c.sharedSuppliers.length >= 20
                          ? 'text-risk-critical'
                          : c.sharedSuppliers.length >= 10
                          ? 'text-risk-high'
                          : 'text-text-primary'
                      }`}
                    >
                      {c.sharedSuppliers.length}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {connections.length > 10 && (
            <p className="text-center text-xs text-text-muted py-2">
              Mostrando top 10 de {connections.length} conexoes
            </p>
          )}
        </div>
      )}

      {/* Stats View */}
      {activeView === 'stats' && (
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {partyStats.slice(0, 10).map((p, idx) => (
            <div key={p.party} className="flex items-center gap-4 p-3 bg-bg-secondary rounded-lg">
              <span className="text-lg font-bold text-text-muted w-6">{idx + 1}</span>
              <span
                className="px-3 py-1 rounded text-sm font-bold text-white min-w-[60px] text-center"
                style={{ backgroundColor: getPartyColor(p.party) }}
              >
                {p.party}
              </span>
              <div className="flex-1 grid grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-text-muted">Deputados</p>
                  <p className="font-medium text-text-primary">{p.deputyCount}</p>
                </div>
                <div>
                  <p className="text-text-muted">Gasto Total</p>
                  <p className="font-medium text-text-primary">{formatReais(p.totalSpending, true)}</p>
                </div>
                <div>
                  <p className="text-text-muted">HHI Medio</p>
                  <p className="font-medium text-text-primary">{formatNumber(Math.round(p.avgHHI))}</p>
                </div>
                <div>
                  <p className="text-text-muted">Fornecedores</p>
                  <p className="font-medium text-text-primary">{formatNumber(p.suppliers.size)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Insight */}
      {topConnections.length > 0 && topConnections[0].sharedSuppliers.length >= 15 && (
        <div className="mt-4 p-3 bg-accent-gold/10 border border-accent-gold/30 rounded-lg">
          <p className="text-sm text-accent-gold">
            <span className="font-bold">{topConnections[0].party1}</span> e{' '}
            <span className="font-bold">{topConnections[0].party2}</span> compartilham{' '}
            <span className="font-bold">{topConnections[0].sharedSuppliers.length}</span> fornecedores em comum.
          </p>
        </div>
      )}
    </div>
  );
}
