import { useMemo, useState, useRef } from 'react';
import type { Deputy } from '../../types/data';
import { formatReais, formatNumber, formatPercent } from '../../utils/formatters';

interface NetworkStatsProps {
  deputies: Deputy[];
}

interface NetworkMetrics {
  // Basic counts
  deputyCount: number;
  supplierCount: number;
  edgeCount: number;

  // Density and connectivity
  density: number;
  avgDegree: number;
  maxDegree: number;
  isolatedNodes: number;

  // Supplier sharing
  sharedSupplierCount: number;
  maxSharing: number;
  avgSharing: number;

  // Risk distribution
  riskDistribution: Record<string, number>;

  // Financial
  totalSpending: number;
  avgSpending: number;
  topSpender: { name: string; value: number };

  // Concentration
  avgHHI: number;
  highConcentration: number;
}

export function NetworkStats({ deputies }: NetworkStatsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate comprehensive network metrics
  const metrics: NetworkMetrics = useMemo(() => {
    // Build supplier -> deputies mapping
    const supplierDeputies = new Map<string, Set<string>>();
    const deputySuppliers = new Map<string, Set<string>>();

    deputies.forEach((d) => {
      const depSuppliers = new Set<string>();
      d.topSuppliers.forEach((s) => {
        const supplierKey = s.name.toLowerCase().trim();
        depSuppliers.add(supplierKey);

        if (!supplierDeputies.has(supplierKey)) {
          supplierDeputies.set(supplierKey, new Set());
        }
        supplierDeputies.get(supplierKey)!.add(d.id.toString());
      });
      deputySuppliers.set(d.id.toString(), depSuppliers);
    });

    // Count edges (deputy-supplier connections)
    let edgeCount = 0;
    deputySuppliers.forEach((suppliers) => {
      edgeCount += suppliers.size;
    });

    // Shared suppliers analysis
    let sharedCount = 0;
    let maxSharing = 0;
    let totalSharing = 0;
    supplierDeputies.forEach((deps) => {
      if (deps.size > 1) {
        sharedCount++;
        totalSharing += deps.size;
        maxSharing = Math.max(maxSharing, deps.size);
      }
    });

    // Degree analysis (how many suppliers each deputy uses)
    let maxDegree = 0;
    let totalDegree = 0;
    let isolated = 0;
    deputySuppliers.forEach((suppliers) => {
      const degree = suppliers.size;
      totalDegree += degree;
      maxDegree = Math.max(maxDegree, degree);
      if (degree === 0) isolated++;
    });

    // Risk distribution
    const riskDist: Record<string, number> = { CRITICO: 0, ALTO: 0, MEDIO: 0, BAIXO: 0 };
    deputies.forEach((d) => {
      riskDist[d.riskLevel] = (riskDist[d.riskLevel] || 0) + 1;
    });

    // Financial metrics
    const totalSpending = deputies.reduce((sum, d) => sum + d.totalSpending, 0);
    const avgSpending = deputies.length > 0 ? totalSpending / deputies.length : 0;
    const topSpender = deputies.reduce(
      (max, d) => (d.totalSpending > max.value ? { name: d.name, value: d.totalSpending } : max),
      { name: '', value: 0 }
    );

    // Concentration metrics
    const avgHHI = deputies.length > 0 ? deputies.reduce((sum, d) => sum + d.hhi.value, 0) / deputies.length : 0;
    const highConcentration = deputies.filter((d) => d.hhi.value > 2500).length;

    // Network density (actual edges / possible edges in bipartite graph)
    const possibleEdges = deputies.length * supplierDeputies.size;
    const density = possibleEdges > 0 ? edgeCount / possibleEdges : 0;

    return {
      deputyCount: deputies.length,
      supplierCount: supplierDeputies.size,
      edgeCount,
      density,
      avgDegree: deputies.length > 0 ? totalDegree / deputies.length : 0,
      maxDegree,
      isolatedNodes: isolated,
      sharedSupplierCount: sharedCount,
      maxSharing,
      avgSharing: sharedCount > 0 ? totalSharing / sharedCount : 0,
      riskDistribution: riskDist,
      totalSpending,
      avgSpending,
      topSpender,
      avgHHI,
      highConcentration,
    };
  }, [deputies]);

  // Export functions
  const exportAsCSV = () => {
    setIsExporting(true);
    setExportFormat('csv');

    try {
      const rows: string[][] = [];

      // Header
      rows.push(['CEAP Network Analysis Report']);
      rows.push(['Generated', new Date().toLocaleDateString('pt-BR')]);
      rows.push([]);

      // Network metrics
      rows.push(['=== MÉTRICAS DA REDE ===']);
      rows.push(['Deputados', metrics.deputyCount.toString()]);
      rows.push(['Fornecedores', metrics.supplierCount.toString()]);
      rows.push(['Conexões', metrics.edgeCount.toString()]);
      rows.push(['Densidade', (metrics.density * 100).toFixed(2) + '%']);
      rows.push(['Grau Médio', metrics.avgDegree.toFixed(1)]);
      rows.push(['Grau Máximo', metrics.maxDegree.toString()]);
      rows.push([]);

      // Supplier sharing
      rows.push(['=== COMPARTILHAMENTO ===']);
      rows.push(['Fornecedores Compartilhados', metrics.sharedSupplierCount.toString()]);
      rows.push(['Max Deputados por Fornecedor', metrics.maxSharing.toString()]);
      rows.push(['Média Deputados por Fornecedor Compartilhado', metrics.avgSharing.toFixed(1)]);
      rows.push([]);

      // Risk distribution
      rows.push(['=== DISTRIBUIÇÃO DE RISCO ===']);
      rows.push(['Critico', metrics.riskDistribution.CRITICO.toString()]);
      rows.push(['Alto', metrics.riskDistribution.ALTO.toString()]);
      rows.push(['Medio', metrics.riskDistribution.MEDIO.toString()]);
      rows.push(['Baixo', metrics.riskDistribution.BAIXO.toString()]);
      rows.push([]);

      // Financial
      rows.push(['=== FINANCEIRO ===']);
      rows.push(['Gasto Total', formatReais(metrics.totalSpending)]);
      rows.push(['Gasto Médio', formatReais(metrics.avgSpending)]);
      rows.push(['Maior Gastador', metrics.topSpender.name]);
      rows.push(['Valor Maior Gastador', formatReais(metrics.topSpender.value)]);
      rows.push([]);

      // Concentration
      rows.push(['=== CONCENTRAÇÃO ===']);
      rows.push(['HHI Médio', metrics.avgHHI.toFixed(0)]);
      rows.push(['Alta Concentração (HHI > 2500)', metrics.highConcentration.toString()]);
      rows.push([]);

      // Deputy list
      rows.push(['=== LISTA DE DEPUTADOS ===']);
      rows.push(['Nome', 'Partido', 'UF', 'Gasto Total', 'HHI', 'Risco', 'Fornecedores']);
      deputies.forEach((d) => {
        rows.push([
          d.name,
          d.party,
          d.uf,
          formatReais(d.totalSpending),
          d.hhi.value.toFixed(0),
          d.riskLevel,
          d.supplierCount.toString(),
        ]);
      });

      // Convert to CSV
      const csvContent = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
      downloadFile(csvContent, 'ceap-network-analysis.csv', 'text/csv;charset=utf-8');
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const exportAsJSON = () => {
    setIsExporting(true);
    setExportFormat('json');

    try {
      const data = {
        metadata: {
          generatedAt: new Date().toISOString(),
          source: 'CEAP Dashboard - Network Analysis',
        },
        networkMetrics: {
          nodes: {
            deputies: metrics.deputyCount,
            suppliers: metrics.supplierCount,
            total: metrics.deputyCount + metrics.supplierCount,
          },
          edges: metrics.edgeCount,
          density: metrics.density,
          avgDegree: metrics.avgDegree,
          maxDegree: metrics.maxDegree,
        },
        supplierSharing: {
          sharedCount: metrics.sharedSupplierCount,
          maxSharing: metrics.maxSharing,
          avgSharing: metrics.avgSharing,
        },
        riskDistribution: metrics.riskDistribution,
        financial: {
          totalSpending: metrics.totalSpending,
          avgSpending: metrics.avgSpending,
          topSpender: metrics.topSpender,
        },
        concentration: {
          avgHHI: metrics.avgHHI,
          highConcentrationCount: metrics.highConcentration,
        },
        deputies: deputies.map((d) => ({
          id: d.id,
          name: d.name,
          party: d.party,
          uf: d.uf,
          totalSpending: d.totalSpending,
          hhi: d.hhi.value,
          riskLevel: d.riskLevel,
          supplierCount: d.supplierCount,
          topSuppliers: d.topSuppliers.slice(0, 5),
        })),
      };

      const jsonContent = JSON.stringify(data, null, 2);
      downloadFile(jsonContent, 'ceap-network-analysis.json', 'application/json');
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-card p-4" ref={containerRef}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Estatísticas da Rede</h3>
        <div className="flex gap-2">
          <button
            onClick={exportAsCSV}
            disabled={isExporting}
            className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary bg-bg-secondary hover:bg-bg-card border border-border rounded transition-all disabled:opacity-50"
          >
            {isExporting && exportFormat === 'csv' ? (
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-accent-teal border-t-transparent rounded-full animate-spin" />
                Exportando...
              </span>
            ) : (
              'CSV'
            )}
          </button>
          <button
            onClick={exportAsJSON}
            disabled={isExporting}
            className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary bg-bg-secondary hover:bg-bg-card border border-border rounded transition-all disabled:opacity-50"
          >
            {isExporting && exportFormat === 'json' ? (
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-accent-teal border-t-transparent rounded-full animate-spin" />
                Exportando...
              </span>
            ) : (
              'JSON'
            )}
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Network Structure */}
        <div className="bg-bg-secondary p-3 rounded-lg">
          <p className="text-xs text-text-muted mb-1">Deputados</p>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(metrics.deputyCount)}</p>
        </div>
        <div className="bg-bg-secondary p-3 rounded-lg">
          <p className="text-xs text-text-muted mb-1">Fornecedores</p>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(metrics.supplierCount)}</p>
        </div>
        <div className="bg-bg-secondary p-3 rounded-lg">
          <p className="text-xs text-text-muted mb-1">Conexões</p>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(metrics.edgeCount)}</p>
        </div>
        <div className="bg-bg-secondary p-3 rounded-lg">
          <p className="text-xs text-text-muted mb-1">Densidade</p>
          <p className="text-2xl font-bold text-accent-teal">{formatPercent(metrics.density)}</p>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Connectivity */}
        <div className="bg-bg-secondary p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Conectividade
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Grau Médio</span>
              <span className="text-text-primary font-mono">{metrics.avgDegree.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Grau Máximo</span>
              <span className="text-text-primary font-mono">{metrics.maxDegree}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Fornec. Compartilhados</span>
              <span className="text-accent-gold font-mono">{formatNumber(metrics.sharedSupplierCount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Max Compartilhamento</span>
              <span className="text-text-primary font-mono">{metrics.maxSharing} deps</span>
            </div>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="bg-bg-secondary p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Distribuição de Risco
          </h4>
          <div className="space-y-2">
            {Object.entries(metrics.riskDistribution).map(([level, count]) => {
              const pct = metrics.deputyCount > 0 ? (count / metrics.deputyCount) * 100 : 0;
              const colorClass =
                level === 'CRITICO'
                  ? 'bg-risk-critical'
                  : level === 'ALTO'
                  ? 'bg-risk-high'
                  : level === 'MEDIO'
                  ? 'bg-risk-medium'
                  : 'bg-risk-low';
              return (
                <div key={level} className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-text-muted capitalize">{level.toLowerCase()}</span>
                    <span className="text-text-primary">
                      {count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-bg-card rounded-full overflow-hidden">
                    <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-bg-secondary p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Resumo Financeiro
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Total Gastos</span>
              <span className="text-text-primary font-mono">{formatReais(metrics.totalSpending, true)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Média por Deputado</span>
              <span className="text-text-primary font-mono">{formatReais(metrics.avgSpending, true)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">HHI Médio</span>
              <span className="text-text-primary font-mono">{formatNumber(Math.round(metrics.avgHHI))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Alta Concentração</span>
              <span className="text-risk-high font-mono">{metrics.highConcentration} deps</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Spender Highlight */}
      {metrics.topSpender.name && (
        <div className="mt-4 p-3 bg-accent-teal/10 border border-accent-teal/30 rounded-lg">
          <p className="text-sm text-accent-teal">
            Maior gastador: <span className="font-bold">{metrics.topSpender.name}</span> com{' '}
            <span className="font-bold">{formatReais(metrics.topSpender.value, true)}</span>
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border text-center text-xs text-text-muted">
        Dados do Portal de Dados Abertos da Câmara dos Deputados
      </div>
    </div>
  );
}
