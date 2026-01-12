import { useState, useMemo, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { NetworkGraph } from '../components/charts/NetworkGraph';
import { SharedSuppliersClusters } from '../components/charts/SharedSuppliersClusters';
import { PartyNetworkAnalysis } from '../components/charts/PartyNetworkAnalysis';
import { RegionalNetworkAnalysis } from '../components/charts/RegionalNetworkAnalysis';
import { NetworkStats } from '../components/charts/NetworkStats';
import { ChartSkeleton } from '../components/ui/Skeleton';
import { NetworkEmpty } from '../components/ui/EmptyState';
import { useDeputies } from '../hooks/useDeputies';
import { formatNumber } from '../utils/formatters';

// Debounce hook for slider inputs
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function Network() {
  const { data: deputies = [], isLoading } = useDeputies();
  const [maxDeputies, setMaxDeputies] = useState(50);
  const [minSupplierPct, setMinSupplierPct] = useState(15);
  const [minHHI, setMinHHI] = useState(1000);

  // Debounce slider values to avoid rebuilding network on every change
  const debouncedMaxDeputies = useDebouncedValue(maxDeputies, 300);
  const debouncedMinSupplierPct = useDebouncedValue(minSupplierPct, 300);
  const debouncedMinHHI = useDebouncedValue(minHHI, 300);

  // Filter deputies with configurable HHI threshold
  const filteredDeputies = useMemo(() => {
    return deputies.filter((d) => d.hhi.value > debouncedMinHHI);
  }, [deputies, debouncedMinHHI]);

  // Calculate stats
  const stats = useMemo(() => {
    const critical = filteredDeputies.filter(d => d.riskLevel === 'CRITICO').length;
    const high = filteredDeputies.filter(d => d.riskLevel === 'ALTO').length;
    return {
      total: filteredDeputies.length,
      critical,
      high,
      avgHHI: filteredDeputies.length > 0
        ? Math.round(filteredDeputies.reduce((sum, d) => sum + d.hhi.value, 0) / filteredDeputies.length)
        : 0,
    };
  }, [filteredDeputies]);

  return (
    <div className="space-y-6">
      <Header
        title="Rede de Conexões"
        subtitle={`Visualize as relações entre ${formatNumber(filteredDeputies.length)} deputados e seus fornecedores`}
      />

      {/* Controls */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <label className="text-sm text-text-secondary whitespace-nowrap">Deputados:</label>
            <input
              type="range"
              min={10}
              max={100}
              value={maxDeputies}
              onChange={(e) => setMaxDeputies(parseInt(e.target.value))}
              className="w-24 accent-accent-teal"
            />
            <span className="text-sm font-mono text-text-primary w-8">
              {maxDeputies}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-text-secondary whitespace-nowrap">
              Min. concentração:
            </label>
            <input
              type="range"
              min={5}
              max={50}
              value={minSupplierPct}
              onChange={(e) => setMinSupplierPct(parseInt(e.target.value))}
              className="w-24 accent-accent-teal"
            />
            <span className="text-sm font-mono text-text-primary w-8">
              {minSupplierPct}%
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-text-secondary whitespace-nowrap">
              Min. HHI:
            </label>
            <input
              type="range"
              min={500}
              max={3000}
              step={100}
              value={minHHI}
              onChange={(e) => setMinHHI(parseInt(e.target.value))}
              className="w-24 accent-accent-teal"
            />
            <span className="text-sm font-mono text-text-primary w-12">
              {minHHI}
            </span>
          </div>

          {/* Quick stats */}
          <div className="ml-auto flex items-center gap-4 text-xs">
            <span className="text-text-muted">
              Crítico: <span className="text-risk-critical font-medium">{stats.critical}</span>
            </span>
            <span className="text-text-muted">
              Alto: <span className="text-risk-high font-medium">{stats.high}</span>
            </span>
            <span className="text-text-muted">
              HHI médio: <span className="text-text-primary font-mono">{formatNumber(stats.avgHHI)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Network Graph */}
      <div
        className="glass-card overflow-hidden"
        style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}
      >
        {isLoading ? (
          <ChartSkeleton type="network" height={500} />
        ) : filteredDeputies.length > 0 ? (
          <NetworkGraph
            deputies={filteredDeputies}
            maxDeputies={debouncedMaxDeputies}
            minSupplierPct={debouncedMinSupplierPct}
          />
        ) : (
          <NetworkEmpty />
        )}
      </div>

      {/* Shared Suppliers Analysis */}
      {!isLoading && filteredDeputies.length > 0 && (
        <SharedSuppliersClusters deputies={filteredDeputies} />
      )}

      {/* Party Network Analysis */}
      {!isLoading && filteredDeputies.length > 0 && (
        <PartyNetworkAnalysis deputies={filteredDeputies} />
      )}

      {/* Regional Network Analysis */}
      {!isLoading && filteredDeputies.length > 0 && (
        <RegionalNetworkAnalysis deputies={filteredDeputies} />
      )}

      {/* Network Stats & Export */}
      {!isLoading && filteredDeputies.length > 0 && (
        <NetworkStats deputies={filteredDeputies} />
      )}

      {/* Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6 border-l-4 border-accent-teal">
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Como Interpretar
          </h2>
          <div className="space-y-3 text-sm text-text-secondary">
            <div>
              <h3 className="font-medium text-accent-teal mb-1">Nos (circulos)</h3>
              <p>
                Circulos maiores representam deputados, coloridos por nivel de risco
                (HHI). Circulos menores sao fornecedores - os azuis claros aparecem em
                mais de um deputado.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-accent-teal mb-1">Arestas (linhas)</h3>
              <p>
                Linhas conectam deputados aos seus fornecedores. A espessura indica a
                porcentagem do gasto total com aquele fornecedor.
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border-l-4 border-accent-gold">
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Interações
          </h2>
          <div className="space-y-2 text-sm text-text-secondary">
            <p className="flex items-center gap-2">
              <span className="text-accent-gold">•</span>
              <strong>Scroll:</strong> Zoom in/out
            </p>
            <p className="flex items-center gap-2">
              <span className="text-accent-gold">•</span>
              <strong>Arrastar fundo:</strong> Mover visualização
            </p>
            <p className="flex items-center gap-2">
              <span className="text-accent-gold">•</span>
              <strong>Arrastar no:</strong> Reposicionar individualmente
            </p>
            <p className="flex items-center gap-2">
              <span className="text-accent-gold">•</span>
              <strong>Passar mouse:</strong> Ver detalhes
            </p>
            <p className="flex items-center gap-2">
              <span className="text-accent-gold">•</span>
              <strong>Clique:</strong> Selecionar e fixar detalhes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
