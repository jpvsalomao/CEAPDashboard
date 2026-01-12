import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { formatReais, abbreviateName, getRiskColor } from '../../utils/formatters';

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  type: 'deputy' | 'supplier';
  name: string;
  party?: string;
  uf?: string;
  riskLevel?: string;
  totalSpending?: number;
  pct?: number;
  connectionCount?: number;
}

interface NetworkLink extends d3.SimulationLinkDatum<NetworkNode> {
  source: string | NetworkNode;
  target: string | NetworkNode;
  value: number;
}

interface NetworkGraphProps {
  deputies: Deputy[];
  maxDeputies?: number;
  minSupplierPct?: number;
}

const RISK_COLORS: Record<string, string> = {
  CRITICO: '#DC4A4A',
  ALTO: '#E5A84B',
  MEDIO: '#4AA3A0',
  BAIXO: '#2ECC71',
};

export function NetworkGraph({
  deputies,
  maxDeputies = 50,
  minSupplierPct = 15,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<NetworkNode, NetworkLink> | null>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Memoize network data construction
  const { nodes, links, stats } = useMemo(() => {
    const topDeputies = [...deputies]
      .sort((a, b) => b.hhi.value - a.hhi.value)
      .slice(0, maxDeputies);

    const nodeList: NetworkNode[] = [];
    const linkList: NetworkLink[] = [];
    const supplierMap = new Map<string, NetworkNode>();
    const supplierConnections = new Map<string, number>();

    // First pass: count supplier connections
    topDeputies.forEach((d) => {
      d.topSuppliers.forEach((s) => {
        if (s.pct >= minSupplierPct) {
          const supplierId = `sup-${s.name.replace(/\s+/g, '-').toLowerCase()}`;
          supplierConnections.set(supplierId, (supplierConnections.get(supplierId) || 0) + 1);
        }
      });
    });

    // Second pass: build nodes and links
    topDeputies.forEach((d) => {
      nodeList.push({
        id: `dep-${d.id}`,
        type: 'deputy',
        name: d.name,
        party: d.party,
        uf: d.uf,
        riskLevel: d.riskLevel,
        totalSpending: d.totalSpending,
      });

      d.topSuppliers.forEach((s) => {
        if (s.pct >= minSupplierPct) {
          const supplierId = `sup-${s.name.replace(/\s+/g, '-').toLowerCase()}`;

          if (!supplierMap.has(supplierId)) {
            const supplierNode: NetworkNode = {
              id: supplierId,
              type: 'supplier',
              name: s.name,
              pct: s.pct,
              connectionCount: supplierConnections.get(supplierId) || 1,
            };
            supplierMap.set(supplierId, supplierNode);
            nodeList.push(supplierNode);
          }

          linkList.push({
            source: `dep-${d.id}`,
            target: supplierId,
            value: s.pct,
          });
        }
      });
    });

    // Calculate stats
    const sharedSuppliers = Array.from(supplierConnections.entries())
      .filter(([, count]) => count > 1).length;

    return {
      nodes: nodeList,
      links: linkList,
      stats: {
        deputyCount: topDeputies.length,
        supplierCount: supplierMap.size,
        linkCount: linkList.length,
        sharedSuppliers,
      },
    };
  }, [deputies, maxDeputies, minSupplierPct]);

  // Canvas rendering for links (much faster than SVG for many edges)
  const drawLinks = useCallback((
    ctx: CanvasRenderingContext2D,
    linksData: NetworkLink[],
    transform: d3.ZoomTransform
  ) => {
    ctx.save();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    // Draw links
    ctx.strokeStyle = '#3a3b45';
    ctx.globalAlpha = 0.5;

    linksData.forEach((link) => {
      const source = link.source as NetworkNode;
      const target = link.target as NetworkNode;
      if (source.x !== undefined && source.y !== undefined &&
          target.x !== undefined && target.y !== undefined) {
        ctx.beginPath();
        ctx.lineWidth = Math.max(0.5, link.value / 15);
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }
    });

    ctx.restore();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !canvasRef.current || !containerRef.current || nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select(svgRef.current);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const tooltip = d3.select(tooltipRef.current);

    // Set canvas size with device pixel ratio for sharpness
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    // Clear previous SVG content
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    // Stop existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Create optimized simulation
    const simulation = d3.forceSimulation<NetworkNode>(nodes)
      .force('link', d3.forceLink<NetworkNode, NetworkLink>(links)
        .id((d) => d.id)
        .distance((d) => {
          // Shorter distance for shared suppliers (more connections)
          const target = d.target as NetworkNode;
          return target.connectionCount && target.connectionCount > 1 ? 60 : 80;
        })
        .strength(0.7))
      .force('charge', d3.forceManyBody<NetworkNode>()
        .strength((d) => d.type === 'deputy' ? -300 : -100)
        .distanceMax(300))  // Limit force range for performance
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<NetworkNode>()
        .radius((d) => d.type === 'deputy' ? 30 : 12)
        .strength(0.8))
      .force('x', d3.forceX(width / 2).strength(0.02))
      .force('y', d3.forceY(height / 2).strength(0.02))
      .alphaDecay(0.02)  // Faster settling
      .velocityDecay(0.4);  // More damping

    simulationRef.current = simulation;

    // Create container group for zoom
    const g = svg.append('g');

    // Track current transform
    let currentTransform = d3.zoomIdentity;

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        currentTransform = event.transform;
        setZoomLevel(event.transform.k);
        g.attr('transform', event.transform.toString());
        if (ctx) {
          drawLinks(ctx, links, event.transform);
        }
      });

    svg.call(zoom);

    // Draw nodes (SVG for interactivity)
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag<SVGGElement, NetworkNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          setIsSimulating(true);
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
        }));

    // Deputy nodes (circles)
    node.filter((d) => d.type === 'deputy')
      .append('circle')
      .attr('r', 20)
      .attr('fill', (d) => RISK_COLORS[d.riskLevel || 'BAIXO'])
      .attr('stroke', '#0D0D0F')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // Deputy labels (only show at higher zoom levels for performance)
    node.filter((d) => d.type === 'deputy')
      .append('text')
      .attr('class', 'deputy-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('fill', '#FAFAFA')
      .attr('font-size', '8px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text((d) => d.name.split(' ')[0].substring(0, 3).toUpperCase());

    // Supplier nodes - size based on connection count
    node.filter((d) => d.type === 'supplier')
      .append('circle')
      .attr('r', (d) => Math.min(12, 6 + (d.connectionCount || 1) * 2))
      .attr('fill', (d) => d.connectionCount && d.connectionCount > 1 ? '#7CB3D9' : '#4A7C9B')
      .attr('stroke', '#0D0D0F')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer');

    // Node interactions
    node.on('mouseenter', function (event, d) {
      d3.select(this).select('circle')
        .transition()
        .duration(150)
        .attr('stroke-width', 4);

      const content = d.type === 'deputy'
        ? `
          <div class="tooltip-title">${d.name}</div>
          <div class="text-text-muted text-xs mb-2">${d.party}-${d.uf}</div>
          <div class="tooltip-label">${d.riskLevel}</div>
          <div class="text-xs text-text-secondary mt-2">
            Total: ${formatReais(d.totalSpending || 0, true)}
          </div>
        `
        : `
          <div class="tooltip-title">Fornecedor</div>
          <div class="text-text-secondary text-sm">${d.name}</div>
          ${d.connectionCount && d.connectionCount > 1
            ? `<div class="text-xs text-accent-teal mt-1">Compartilhado por ${d.connectionCount} deputados</div>`
            : ''}
        `;

      tooltip
        .style('opacity', 1)
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 10}px`)
        .html(content);
    })
    .on('mousemove', function (event) {
      tooltip
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 10}px`);
    })
    .on('mouseleave', function (_, d) {
      d3.select(this).select('circle')
        .transition()
        .duration(150)
        .attr('stroke-width', d.type === 'deputy' ? 2 : 1);
      tooltip.style('opacity', 0);
    })
    .on('click', function (event, d) {
      event.stopPropagation();
      setSelectedNode(d);
    });

    // Optimized tick - throttled canvas updates
    let ticks = 0;
    simulation.on('tick', () => {
      ticks++;

      // Update canvas every frame during active simulation
      if (ctx) {
        drawLinks(ctx, links, currentTransform);
      }

      // Update node positions
      node.attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`);

      // Check if simulation is settling
      if (simulation.alpha() < 0.01) {
        setIsSimulating(false);
      }
    });

    // Track simulation end
    simulation.on('end', () => {
      setIsSimulating(false);
    });

    // Click on background to deselect
    svg.on('click', () => setSelectedNode(null));

    // Initial canvas draw
    if (ctx) {
      drawLinks(ctx, links, currentTransform);
    }

    // Cleanup
    return () => {
      simulation.stop();
      simulationRef.current = null;
    };
  }, [nodes, links, drawLinks]);

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      {/* Canvas layer for links (behind SVG) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* SVG layer for nodes (interactive) */}
      <svg ref={svgRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }} />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="tooltip"
        style={{ opacity: 0, zIndex: 50 }}
      />

      {/* Stats bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-bg-card-solid/90 backdrop-blur-sm px-4 py-2 rounded-full border border-border text-xs flex items-center gap-4">
        <span className="text-text-muted">
          <span className="font-medium text-text-primary">{stats.deputyCount}</span> deputados
        </span>
        <span className="text-border">|</span>
        <span className="text-text-muted">
          <span className="font-medium text-text-primary">{stats.supplierCount}</span> fornecedores
        </span>
        <span className="text-border">|</span>
        <span className="text-text-muted">
          <span className="font-medium text-text-primary">{stats.linkCount}</span> conexoes
        </span>
        {stats.sharedSuppliers > 0 && (
          <>
            <span className="text-border">|</span>
            <span className="text-accent-teal">
              <span className="font-medium">{stats.sharedSuppliers}</span> compartilhados
            </span>
          </>
        )}
        {isSimulating && (
          <>
            <span className="text-border">|</span>
            <span className="text-accent-gold flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-accent-gold animate-pulse" />
              calculando...
            </span>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-bg-card-solid p-3 rounded-lg border border-border text-xs">
        <div className="font-medium text-text-primary mb-2">Legenda</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#DC4A4A]" />
            <span className="text-text-secondary">Critico</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#E5A84B]" />
            <span className="text-text-secondary">Alto</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#4AA3A0]" />
            <span className="text-text-secondary">Medio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#2ECC71]" />
            <span className="text-text-secondary">Baixo</span>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
            <div className="w-3 h-3 rounded-full bg-[#4A7C9B]" />
            <span className="text-text-secondary">Fornecedor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-[#7CB3D9]" />
            <span className="text-text-secondary">Compartilhado</span>
          </div>
        </div>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-bg-card-solid px-3 py-2 rounded-lg border border-border text-xs text-text-muted">
        Zoom: {Math.round(zoomLevel * 100)}% • Scroll para zoom • Arraste para mover
      </div>

      {/* Selected node details */}
      {selectedNode && selectedNode.type === 'deputy' && (
        <div className="absolute top-16 right-4 w-64 bg-bg-card-solid p-4 rounded-lg border border-border shadow-xl">
          <button
            className="absolute top-2 right-2 text-text-muted hover:text-text-primary"
            onClick={() => setSelectedNode(null)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h3 className="font-medium text-text-primary pr-4">
            {abbreviateName(selectedNode.name)}
          </h3>
          <p className="text-sm text-text-muted">
            {selectedNode.party}-{selectedNode.uf}
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Risco:</span>
              <span className={getRiskColor(selectedNode.riskLevel || '')}>
                {selectedNode.riskLevel}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Total:</span>
              <span className="font-mono text-text-primary">
                {formatReais(selectedNode.totalSpending || 0, true)}
              </span>
            </div>
          </div>
          <a
            href={`/deputados/${selectedNode.id.replace('dep-', '')}`}
            className="mt-3 block text-center text-xs text-accent-teal hover:underline"
          >
            Ver perfil completo
          </a>
        </div>
      )}

      {/* Shared supplier details */}
      {selectedNode && selectedNode.type === 'supplier' && (
        <div className="absolute top-16 right-4 w-64 bg-bg-card-solid p-4 rounded-lg border border-border shadow-xl">
          <button
            className="absolute top-2 right-2 text-text-muted hover:text-text-primary"
            onClick={() => setSelectedNode(null)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h3 className="font-medium text-text-primary pr-4 text-sm">
            {selectedNode.name}
          </h3>
          <p className="text-xs text-text-muted mt-1">Fornecedor</p>
          {selectedNode.connectionCount && selectedNode.connectionCount > 1 && (
            <div className="mt-3 p-2 bg-accent-teal/10 rounded border border-accent-teal/30">
              <p className="text-xs text-accent-teal">
                Compartilhado por <span className="font-bold">{selectedNode.connectionCount}</span> deputados
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
