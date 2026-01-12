/**
 * Analysis Page
 * Pattern exploration and risk analysis dashboard
 */

import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { ChartSkeleton, StatCardSkeleton } from '../components/ui/Skeleton';
import { useDeputies } from '../hooks/useDeputies';
import { useAggregations } from '../hooks/useAggregations';
import { useMismatches, useRiskStats, useBenfordAnalysis } from '../hooks/useFraudFlags';
import { formatNumber } from '../utils/formatters';

// Import decomposed tab modules
import {
  TabNavigation,
  type TabId,
  OverviewTab,
  ConcentrationTab,
  AnomaliesTab,
  PatternsTab,
  ComparisonsTab,
  MismatchesTab,
} from './analysis-tabs';

export function Analysis() {
  const { data: deputies = [], isLoading: deputiesLoading } = useDeputies();
  const { data: aggregations } = useAggregations();
  const { data: mismatches = [], isLoading: mismatchesLoading } = useMismatches();
  const riskStats = useRiskStats();
  const benfordAnalysis = useBenfordAnalysis();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [partyMetric, setPartyMetric] = useState<'total' | 'average'>('total');
  const [stateMetric, setStateMetric] = useState<'total' | 'average'>('average');

  // Filter deputies with high HHI
  const highHHIDeputies = deputies.filter((d) => d.hhi.value > 1500);
  const partyData = aggregations?.byParty ?? [];
  const stateData = aggregations?.byState ?? [];
  const monthlyData = aggregations?.byMonth ?? [];
  const categoryData = aggregations?.byCategory ?? [];

  const isLoading = deputiesLoading || mismatchesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header
          title="Análise de Padrões"
          subtitle="Carregando dados..."
        />
        <StatCardSkeleton count={4} />
        <div className="glass-card p-6">
          <div className="animate-pulse bg-bg-secondary h-6 w-64 rounded mb-4" />
          <ChartSkeleton type="bar" height={500} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        title="Análise de Padrões"
        subtitle="Exploração de padrões e tendências em gastos parlamentares"
      />

      {/* Risk Summary Stats - Always visible */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-risk-critical">
            {riskStats.byRiskLevel.CRITICO.length}
          </p>
          <p className="text-sm text-text-secondary">Casos Críticos</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-risk-high">
            {riskStats.byRiskLevel.ALTO.length}
          </p>
          <p className="text-sm text-text-secondary">Alto Risco</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-accent-teal">
            {formatNumber(mismatches.length)}
          </p>
          <p className="text-sm text-text-secondary">CNPJs Irregulares</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-text-primary">
            {riskStats.avgRiskScore.toFixed(2)}
          </p>
          <p className="text-sm text-text-secondary">Score Médio de Risco</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <OverviewTab deputies={deputies} riskStats={riskStats} />
        )}

        {activeTab === 'concentration' && (
          <ConcentrationTab deputies={deputies} highHHIDeputies={highHHIDeputies} />
        )}

        {activeTab === 'anomalies' && (
          <AnomaliesTab deputies={deputies} benfordAnalysis={benfordAnalysis} />
        )}

        {activeTab === 'patterns' && (
          <PatternsTab deputies={deputies} monthlyData={monthlyData} />
        )}

        {activeTab === 'comparisons' && (
          <ComparisonsTab
            deputies={deputies}
            partyData={partyData}
            stateData={stateData}
            categoryData={categoryData}
            partyMetric={partyMetric}
            stateMetric={stateMetric}
            onPartyMetricChange={setPartyMetric}
            onStateMetricChange={setStateMetric}
          />
        )}

        {activeTab === 'mismatches' && (
          <MismatchesTab mismatches={mismatches} />
        )}
      </div>
    </div>
  );
}
