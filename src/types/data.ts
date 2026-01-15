// Core data types for CEAP Dashboard

export type RiskLevel = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAIXO';

export interface Aggregations {
  meta: {
    totalTransactions: number;
    totalSpending: number;
    totalDeputies: number;
    totalSuppliers: number;
    period: {
      start: string;
      end: string;
    };
    lastUpdated: string;
  };
  byMonth: MonthlyData[];
  byCategory: CategoryData[];
  byParty: PartyData[];
  byState: StateData[];
}

export interface MonthlyData {
  month: string; // YYYY-MM
  value: number;
  transactionCount: number;
}

export interface CategoryData {
  category: string;
  categoryCode: number;
  value: number;
  pct: number;
  transactionCount: number;
}

export interface PartyData {
  party: string;
  value: number;
  deputyCount: number;
  avgPerDeputy: number;
}

export interface StateData {
  uf: string;
  value: number;
  deputyCount: number;
  avgPerDeputy: number;
}

export interface BenfordDigit {
  digit: number;
  observed: number;
  expected: number;
}

export interface DeputyCategoryBreakdown {
  category: string;
  value: number;
  pct: number;
  transactionCount: number;
}

export interface DeputyMonthlyBreakdown {
  month: string;
  value: number;
  transactionCount: number;
}

export interface DeputyAttendance {
  totalEvents: number;
  uniqueEvents: number;
  rate: number;  // Average attendance rate (0-100)
  events2023: number;
  events2024: number;
  events2025: number;
}

export interface Deputy {
  id: number;
  name: string;
  party: string;
  uf: string;
  totalSpending: number;
  transactionCount: number;
  avgTicket: number;
  supplierCount: number;
  supplierCnpjs?: string[];  // List of unique supplier CNPJs for this deputy
  hhi: {
    value: number;
    level: RiskLevel;
  };
  benford: {
    chi2: number;
    pValue: number;
    significant: boolean;
    digitDistribution?: BenfordDigit[];
  };
  roundValuePct: number;
  riskScore: number;
  riskLevel: RiskLevel;
  topSuppliers: SupplierShare[];
  redFlags: string[];
  byCategory?: DeputyCategoryBreakdown[];
  byMonth?: DeputyMonthlyBreakdown[];
  zScoreParty?: number;  // Z-score vs party average spending
  zScoreState?: number;  // Z-score vs state average spending
  // Profile enrichment fields
  education?: string;       // Education level (e.g., "Superior Completo")
  profession?: string;      // Professional background (e.g., "Advogado")
  birthYear?: number;       // Year of birth
  age?: number;             // Current age
  mandateCount?: number;    // Number of terms served
  // Attendance metrics
  attendance?: DeputyAttendance;
}

export interface SupplierShare {
  name: string;
  cnpj: string;
  value: number;
  pct: number;
}

export interface FraudFlag {
  deputyId: number;
  deputyName: string;
  party: string;
  uf: string;
  flags: string[];
  details: {
    benfordDeviation: boolean;
    benfordChi2?: number;
    roundValuePct: number;
    supplierConcentration: boolean;
    hhiValue?: number;
    cnpjMismatches: number;
    weekendPct: number;
  };
  riskScore: number;
  riskLevel: RiskLevel;
}

export interface CNPJMismatch {
  cnpj: string;
  supplierName: string;
  razaoSocial: string;
  expenseCategory: string;
  cnaePrincipal: string;
  totalValue: number;
  transactionCount: number;
  deputyCount: number;
  reason: string;
  uf: string;
}

export interface NetworkNode {
  id: string;
  type: 'deputy' | 'supplier';
  name: string;
  party?: string;
  uf?: string;
  value: number;
  riskLevel?: RiskLevel;
}

export interface NetworkEdge {
  source: string;
  target: string;
  value: number;
  transactionCount: number;
}

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

// Filter state
export interface FilterState {
  years: number[];
  states: string[];
  parties: string[];
  categories: string[];
  riskLevels: RiskLevel[];
  searchQuery: string;
}

// Case study
export interface CaseStudy {
  slug: string;
  deputyName: string;
  party: string;
  uf: string;
  title: string;
  summary: string;
  totalSpending: number;
  redFlags: CaseStudyFlag[];
  timeline: CaseStudyEvent[];
  comparisons: CaseStudyComparison[];
}

export interface CaseStudyFlag {
  title: string;
  value: string;
  description: string;
  severity: RiskLevel;
}

export interface CaseStudyEvent {
  date: string;
  event: string;
  type: 'spending' | 'investigation' | 'news';
}

export interface CaseStudyComparison {
  metric: string;
  deputyValue: number;
  averageValue: number;
  pctDifference: number;
}

// ============================================
// Emendas Parlamentares Types (Spotlight Integration)
// ============================================

export interface BeneficiaryShare {
  name: string;
  cnpj: string | null;
  value: number;
  pct: number;
  municipality?: string;
  uf?: string;
  count?: number;
}

export interface EmendaYearData {
  year: number;
  value: number;
}

export interface EmendaFunctionData {
  function: string;
  value: number;
}

export interface SpotlightEmendas {
  totalEmpenhado: number;
  totalPago: number;
  recordCount: number;
  beneficiaryCount: number;
  hhi: number;
  topBeneficiaries: BeneficiaryShare[];
  byYear: Record<number, number>;
  byFunction: Record<string, number>;
  byType: Record<string, number>;
}

export interface SharedBeneficiary {
  cnpj: string;
  name: string;
  deputies: Record<string, number>;
  total: number;
}

export interface SpotlightCrossRef {
  sharedBeneficiaries: SharedBeneficiary[];
  sharedCount: number;
  totalSharedValue: number;
  cnpjOverlap: number;  // CNPJ overlap between CEAP and Emendas (typically 0)
}

export interface SpotlightDeputyData {
  name: string;
  party: string;
  uf: string;
  ceap: {
    total: number;
    transactions: number;
    suppliers: number;
    hhi: number;
    benfordChi2: number;
    benfordPValue: number;
    roundPct: number;
  };
  emendas: SpotlightEmendas;
}

export interface InvestigationTimelineEvent {
  date: string;
  phase: string;
  event: string;
  type: 'investigation' | 'news' | 'official';
}

export interface SpotlightDebateSection {
  title: string;
  points: string[];
}

export interface SpotlightDebate {
  prosecution: SpotlightDebateSection;
  defense: SpotlightDebateSection;
}

export interface SpotlightMethodology {
  dataSources: string[];
  metrics: string[];
  limitations: string[];
}

export interface OvercleanSpotlightData {
  generated: string;
  generator: string;
  id: string;
  title: string;
  subtitle: string;
  deputies: SpotlightDeputyData[];
  crossRef: SpotlightCrossRef;
  timeline: InvestigationTimelineEvent[];
  insights: string[];
  debate: SpotlightDebate;
  methodology: SpotlightMethodology;
}

// ============================================
// Data Manifest Types
// ============================================

// Data manifest for reproducibility and auditing
export interface DataManifest {
  version: string;
  generated_at: string;
  generator: string;
  source_data: {
    file: string;
    sha256: string;
    size_bytes: number;
    last_modified: string | null;
    api_source: string;
    period: {
      start: string;
      end: string;
    };
    record_count: number;
    total_value_brl: number;
  };
  output_files: {
    [filename: string]: {
      record_count: number;
      description: string;
    };
  };
  methodology: {
    benford_threshold: {
      chi2_critical_001: number;
      chi2_critical_005: number;
      degrees_of_freedom: number;
      description: string;
    };
    hhi_thresholds: {
      low: number;
      moderate: number;
      high: number;
      very_high: number;
      description: string;
    };
    risk_score: {
      base_weights: {
        hhi_critical: number;
        hhi_high: number;
        hhi_moderate: number;
        hhi_low: number;
      };
      additive_penalties: {
        benford_significant: number;
        round_values_above_20pct: number;
        top_supplier_above_50pct: number;
        zscore_party_above_2std: number;
        zscore_state_above_2std: number;
      };
      max_score: number;
      risk_level_thresholds: {
        critico: number;
        alto: number;
        medio: number;
        baixo: number;
      };
    };
  };
  reproducibility_notes: string[];
}
