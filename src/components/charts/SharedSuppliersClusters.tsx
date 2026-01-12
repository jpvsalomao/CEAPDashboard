import { useMemo, useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { formatReais, abbreviateName, formatNumber } from '../../utils/formatters';

interface SharedSuppliersClustersProps {
  deputies: Deputy[];
}

interface SharedSupplier {
  name: string;
  deputyIds: number[];
  deputyNames: string[];
  totalValue: number;
  avgPct: number;
}

interface Cluster {
  id: number;
  deputies: {
    id: number;
    name: string;
    party: string;
    uf: string;
  }[];
  sharedSuppliers: string[];
  connectionStrength: number; // Number of shared suppliers
}

const RISK_COLORS: Record<string, string> = {
  CRITICO: '#DC4A4A',
  ALTO: '#E5A84B',
  MEDIO: '#4AA3A0',
  BAIXO: '#2ECC71',
};

export function SharedSuppliersClusters({ deputies }: SharedSuppliersClustersProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'suppliers' | 'clusters' | 'network'>('suppliers');
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);

  // Analyze shared suppliers
  const { sharedSuppliers, clusters, stats } = useMemo(() => {
    const supplierDeputies = new Map<string, { deputyIds: number[]; deputyNames: string[]; totalValue: number; pcts: number[] }>();

    // Build supplier -> deputies mapping
    deputies.forEach((d) => {
      d.topSuppliers.forEach((s) => {
        const key = s.name.toLowerCase().trim();
        if (!supplierDeputies.has(key)) {
          supplierDeputies.set(key, { deputyIds: [], deputyNames: [], totalValue: 0, pcts: [] });
        }
        const entry = supplierDeputies.get(key)!;
        if (!entry.deputyIds.includes(d.id)) {
          entry.deputyIds.push(d.id);
          entry.deputyNames.push(d.name);
        }
        entry.totalValue += s.value;
        entry.pcts.push(s.pct);
      });
    });

    // Filter to shared suppliers (2+ deputies)
    const shared: SharedSupplier[] = [];
    supplierDeputies.forEach((value, name) => {
      if (value.deputyIds.length >= 2) {
        shared.push({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          deputyIds: value.deputyIds,
          deputyNames: value.deputyNames,
          totalValue: value.totalValue,
          avgPct: value.pcts.reduce((a, b) => a + b, 0) / value.pcts.length,
        });
      }
    });

    // Sort by number of deputies sharing
    shared.sort((a, b) => b.deputyIds.length - a.deputyIds.length);

    // Build deputy -> deputy connection matrix based on shared suppliers
    const deputyConnections = new Map<number, Map<number, string[]>>();
    shared.forEach((supplier) => {
      for (let i = 0; i < supplier.deputyIds.length; i++) {
        for (let j = i + 1; j < supplier.deputyIds.length; j++) {
          const id1 = supplier.deputyIds[i];
          const id2 = supplier.deputyIds[j];

          if (!deputyConnections.has(id1)) {
            deputyConnections.set(id1, new Map());
          }
          if (!deputyConnections.has(id2)) {
            deputyConnections.set(id2, new Map());
          }

          const conn1 = deputyConnections.get(id1)!;
          const conn2 = deputyConnections.get(id2)!;

          if (!conn1.has(id2)) conn1.set(id2, []);
          if (!conn2.has(id1)) conn2.set(id1, []);

          conn1.get(id2)!.push(supplier.name);
          conn2.get(id1)!.push(supplier.name);
        }
      }
    });

    // Find clusters (deputies with 2+ shared suppliers)
    const clustersList: Cluster[] = [];
    const visitedPairs = new Set<string>();
    let clusterId = 0;

    deputyConnections.forEach((connections, deputyId) => {
      connections.forEach((suppliers, connectedId) => {
        const pairKey = [deputyId, connectedId].sort().join('-');
        if (suppliers.length >= 2 && !visitedPairs.has(pairKey)) {
          visitedPairs.add(pairKey);

          const dep1 = deputies.find((d) => d.id === deputyId);
          const dep2 = deputies.find((d) => d.id === connectedId);

          if (dep1 && dep2) {
            clustersList.push({
              id: clusterId++,
              deputies: [
                { id: dep1.id, name: dep1.name, party: dep1.party, uf: dep1.uf },
                { id: dep2.id, name: dep2.name, party: dep2.party, uf: dep2.uf },
              ],
              sharedSuppliers: suppliers,
              connectionStrength: suppliers.length,
            });
          }
        }
      });
    });

    // Sort clusters by connection strength
    clustersList.sort((a, b) => b.connectionStrength - a.connectionStrength);

    return {
      sharedSuppliers: shared.slice(0, 20), // Top 20
      clusters: clustersList.slice(0, 15), // Top 15 clusters
      stats: {
        totalShared: shared.length,
        maxSharing: shared.length > 0 ? shared[0].deputyIds.length : 0,
        totalClusters: clustersList.length,
        strongClusters: clustersList.filter((c) => c.connectionStrength >= 3).length,
      },
    };
  }, [deputies]);

  // Mini network visualization
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || activeTab !== 'network' || sharedSuppliers.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 400;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);

    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    // Build simplified network from top shared suppliers
    interface Node extends d3.SimulationNodeDatum {
      id: string;
      type: 'deputy' | 'supplier';
      name: string;
      party?: string;
      uf?: string;
      riskLevel?: string;
      count?: number;
    }

    interface Link extends d3.SimulationLinkDatum<Node> {
      source: string | Node;
      target: string | Node;
    }

    const nodes: Node[] = [];
    const links: Link[] = [];
    const deputySet = new Set<number>();
    const supplierSet = new Set<string>();

    // Only use top 10 shared suppliers for visualization
    const topShared = sharedSuppliers.slice(0, 10);

    topShared.forEach((supplier) => {
      const supplierId = `sup-${supplier.name}`;
      if (!supplierSet.has(supplierId)) {
        supplierSet.add(supplierId);
        nodes.push({
          id: supplierId,
          type: 'supplier',
          name: supplier.name,
          count: supplier.deputyIds.length,
        });
      }

      supplier.deputyIds.slice(0, 5).forEach((depId) => {
        const dep = deputies.find((d) => d.id === depId);
        if (!dep) return;

        if (!deputySet.has(depId)) {
          deputySet.add(depId);
          nodes.push({
            id: `dep-${depId}`,
            type: 'deputy',
            name: dep.name,
            party: dep.party,
            uf: dep.uf,
            riskLevel: dep.riskLevel,
          });
        }

        links.push({
          source: `dep-${depId}`,
          target: supplierId,
        });
      });
    });

    // Create simulation
    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id((d) => d.id).distance(60))
      .force('charge', d3.forceManyBody<Node>().strength((d) => (d.type === 'supplier' ? -150 : -80)))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<Node>().radius((d) => (d.type === 'supplier' ? 20 : 15)));

    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
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
      .attr('stroke', '#3a3b45')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.6);

    // Nodes
    const node = g
      .append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
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

    // Deputy circles
    node
      .filter((d) => d.type === 'deputy')
      .append('circle')
      .attr('r', 12)
      .attr('fill', (d) => RISK_COLORS[d.riskLevel || 'BAIXO'])
      .attr('stroke', '#0D0D0F')
      .attr('stroke-width', 1.5);

    // Supplier circles (larger, different color)
    node
      .filter((d) => d.type === 'supplier')
      .append('circle')
      .attr('r', (d) => Math.min(18, 10 + (d.count || 1) * 2))
      .attr('fill', '#7CB3D9')
      .attr('stroke', '#0D0D0F')
      .attr('stroke-width', 1.5);

    // Supplier labels
    node
      .filter((d) => d.type === 'supplier')
      .append('text')
      .attr('dy', 30)
      .attr('text-anchor', 'middle')
      .attr('fill', '#B0B0B0')
      .attr('font-size', '9px')
      .text((d) => d.name.substring(0, 15) + (d.name.length > 15 ? '...' : ''));

    // Tooltips
    node
      .on('mouseenter', function (event, d) {
        d3.select(this).select('circle').attr('stroke-width', 3);

        const content =
          d.type === 'deputy'
            ? `<div class="tooltip-title">${d.name}</div>
             <div class="text-text-muted text-xs">${d.party}-${d.uf}</div>`
            : `<div class="tooltip-title">${d.name}</div>
             <div class="text-text-muted text-xs">Compartilhado por ${d.count} deputados</div>`;

        tooltip
          .style('opacity', 1)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`)
          .html(content);
      })
      .on('mouseleave', function () {
        d3.select(this).select('circle').attr('stroke-width', 1.5);
        tooltip.style('opacity', 0);
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
  }, [activeTab, sharedSuppliers, deputies]);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Análise de Fornecedores Compartilhados</h3>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-accent-teal/20 text-accent-teal rounded">
            {formatNumber(stats.totalShared)} fornecedores
          </span>
          <span className="px-2 py-1 bg-accent-gold/20 text-accent-gold rounded">
            {formatNumber(stats.totalClusters)} conexões
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-border">
        {[
          { id: 'suppliers', label: 'Top Compartilhados' },
          { id: 'clusters', label: 'Pares de Deputados' },
          { id: 'network', label: 'Visualização' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-accent-teal border-b-2 border-accent-teal -mb-px'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'suppliers' && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {sharedSuppliers.length === 0 ? (
            <p className="text-text-muted text-sm py-8 text-center">
              Nenhum fornecedor compartilhado encontrado com os filtros atuais.
            </p>
          ) : (
            sharedSuppliers.map((supplier, idx) => (
              <div
                key={supplier.name}
                className="flex items-start gap-3 p-3 bg-bg-secondary rounded-lg hover:bg-bg-card transition-colors"
              >
                <span className="text-2xl font-bold text-text-muted w-8">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate" title={supplier.name}>
                    {supplier.name}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {supplier.deputyIds.length} deputados • {formatReais(supplier.totalValue, true)} total
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {supplier.deputyNames.slice(0, 4).map((name) => (
                      <span key={name} className="px-2 py-0.5 bg-bg-card text-text-secondary text-xs rounded">
                        {abbreviateName(name)}
                      </span>
                    ))}
                    {supplier.deputyNames.length > 4 && (
                      <span className="px-2 py-0.5 text-text-muted text-xs">
                        +{supplier.deputyNames.length - 4}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-accent-teal">{supplier.deputyIds.length}</span>
                  <p className="text-xs text-text-muted">deputados</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'clusters' && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {clusters.length === 0 ? (
            <p className="text-text-muted text-sm py-8 text-center">
              Nenhum par de deputados com 2+ fornecedores em comum encontrado.
            </p>
          ) : (
            clusters.map((cluster) => (
              <div
                key={cluster.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedCluster?.id === cluster.id
                    ? 'bg-accent-teal/10 border border-accent-teal/30'
                    : 'bg-bg-secondary hover:bg-bg-card'
                }`}
                onClick={() => setSelectedCluster(selectedCluster?.id === cluster.id ? null : cluster)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {cluster.deputies.map((dep, i) => (
                      <span key={dep.id}>
                        <span className="font-medium text-text-primary">{abbreviateName(dep.name)}</span>
                        <span className="text-text-muted text-xs ml-1">({dep.party}-{dep.uf})</span>
                        {i === 0 && <span className="mx-2 text-text-muted">↔</span>}
                      </span>
                    ))}
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      cluster.connectionStrength >= 4
                        ? 'bg-risk-critical/20 text-risk-critical'
                        : cluster.connectionStrength >= 3
                        ? 'bg-risk-high/20 text-risk-high'
                        : 'bg-accent-teal/20 text-accent-teal'
                    }`}
                  >
                    {cluster.connectionStrength} em comum
                  </span>
                </div>

                {selectedCluster?.id === cluster.id && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-text-muted mb-2">Fornecedores compartilhados:</p>
                    <div className="flex flex-wrap gap-1">
                      {cluster.sharedSuppliers.map((name) => (
                        <span key={name} className="px-2 py-1 bg-bg-card text-text-secondary text-xs rounded">
                          {name.substring(0, 30)}
                          {name.length > 30 ? '...' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'network' && (
        <div ref={containerRef} className="relative" style={{ height: 400 }}>
          <svg ref={svgRef} className="w-full h-full" />
          <div ref={tooltipRef} className="tooltip" style={{ opacity: 0 }} />

          {/* Legend */}
          <div className="absolute bottom-2 left-2 bg-bg-card-solid/90 p-2 rounded text-xs">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-[#7CB3D9]" />
              <span className="text-text-muted">Fornecedor compartilhado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#4AA3A0]" />
              <span className="text-text-muted">Deputado</span>
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      {stats.strongClusters > 0 && (
        <div className="mt-4 p-3 bg-accent-gold/10 border border-accent-gold/30 rounded-lg">
          <p className="text-sm text-accent-gold">
            <span className="font-bold">{stats.strongClusters}</span> pares de deputados compartilham{' '}
            <span className="font-bold">3 ou mais</span> fornecedores em comum.
          </p>
        </div>
      )}
    </div>
  );
}
