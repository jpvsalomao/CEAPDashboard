import { LockedSection } from '../ui/LockedSection';
import { EntityDiagram } from './EntityDiagram';
import { FieldGlossary } from './FieldGlossary';
import { FEATURES } from '../../config/features';

/**
 * DataModelSection - Complete data model documentation section
 *
 * Displays as a locked subscriber section on the Methodology page.
 * Shows teaser content (intro + simplified diagram) and locks the
 * full content (complete diagram + field glossary).
 */
export function DataModelSection() {
  // Don't render anything if subscriber preview is disabled
  if (!FEATURES.SHOW_SUBSCRIBER_PREVIEW) {
    return null;
  }

  return (
    <LockedSection
      title="7. Modelo de Dados"
      badgeText="ASSINANTES"
      teaserContent={<TeaserContent />}
      lockedContent={<LockedContent />}
      ctaTitle="Acesso Completo ao Modelo de Dados"
      ctaDescription="Entenda a arquitetura de dados por tras das visualizacoes. Documentacao completa de todas as entidades, campos e relacionamentos."
      ctaButtonText="Quero Ser Assinante"
      ctaHref="#newsletter" // Future: link to subscription page
    />
  );
}

/**
 * TeaserContent - Visible content preview
 */
function TeaserContent() {
  return (
    <div className="space-y-4">
      {/* Introduction */}
      <div className="glass-card p-6">
        <p className="text-text-secondary">
          Entenda como os dados fluem desde a API da Camara dos Deputados ate as
          visualizacoes do dashboard. O modelo de dados foi projetado para suportar
          analises de risco em multiplas dimensoes.
        </p>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-bg-secondary p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-accent-teal">5</p>
            <p className="text-xs text-text-muted">Entidades</p>
          </div>
          <div className="bg-bg-secondary p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-accent-teal">45+</p>
            <p className="text-xs text-text-muted">Campos</p>
          </div>
          <div className="bg-bg-secondary p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-accent-teal">4</p>
            <p className="text-xs text-text-muted">Arquivos JSON</p>
          </div>
          <div className="bg-bg-secondary p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-accent-teal">~7MB</p>
            <p className="text-xs text-text-muted">Dados</p>
          </div>
        </div>
      </div>

      {/* Simplified entity preview */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-3">
          Entidades Principais
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          Visao simplificada das entidades centrais do sistema:
        </p>
        <EntityDiagram simplified height={280} />
      </div>

      {/* What's included teaser */}
      <div className="glass-card p-6 border-l-4 border-accent-teal">
        <h4 className="text-sm font-semibold text-text-primary mb-2">
          O que voce vai encontrar:
        </h4>
        <ul className="text-sm text-text-secondary space-y-1">
          <li className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-accent-teal flex-shrink-0" />
            Diagrama completo de entidades e relacionamentos
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-accent-teal flex-shrink-0" />
            Glossario pesquisavel com 45+ campos documentados
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-accent-teal flex-shrink-0" />
            Formulas de calculo dos indicadores de risco
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-accent-teal flex-shrink-0" />
            Referencia dos arquivos JSON e seus schemas
          </li>
        </ul>
      </div>
    </div>
  );
}

/**
 * LockedContent - Full content (blurred when locked)
 */
function LockedContent() {
  return (
    <div className="space-y-6">
      {/* Full Entity Diagram */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Diagrama Completo de Entidades
        </h3>
        <EntityDiagram height={450} />
      </div>

      {/* Relationships explanation */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-3">
          Relacionamentos
        </h3>
        <div className="space-y-3">
          <RelationshipCard
            source="Deputy"
            target="SupplierShare"
            type="1:N"
            description="Um deputado tem multiplos fornecedores com suas respectivas participacoes nos gastos"
          />
          <RelationshipCard
            source="Deputy"
            target="FraudFlag"
            type="1:1"
            description="Cada deputado possui um conjunto unico de indicadores de risco"
          />
          <RelationshipCard
            source="Supplier"
            target="CNPJMismatch"
            type="1:N"
            description="Um fornecedor pode ter multiplas incompatibilidades CNPJ/CNAE identificadas"
          />
        </div>
      </div>

      {/* JSON Files Reference */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-3">
          Arquivos de Dados
        </h3>
        <div className="space-y-2">
          <FileReferenceRow
            filename="deputies.json"
            size="~7MB"
            records={847}
            description="Dados completos de todos os deputados com scores calculados"
          />
          <FileReferenceRow
            filename="aggregations.json"
            size="~13KB"
            records={1}
            description="Estatisticas agregadas por mes, categoria, partido e estado"
          />
          <FileReferenceRow
            filename="fraud-flags.json"
            size="~200KB"
            records={847}
            description="Indicadores de risco detalhados por deputado"
          />
          <FileReferenceRow
            filename="mismatches.json"
            size="~50KB"
            records="variavel"
            description="Incompatibilidades CNPJ/CNAE identificadas"
          />
        </div>
      </div>

      {/* Risk Score Formula */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-3">
          Formula do Score de Risco
        </h3>
        <div className="bg-bg-secondary p-4 rounded-lg font-mono text-sm">
          <code className="text-accent-teal">
            risk_score = min(
            <br />
            &nbsp;&nbsp;base_hhi +
            <br />
            &nbsp;&nbsp;(benford_significant ? 0.15 : 0) +
            <br />
            &nbsp;&nbsp;(round_pct &gt; 0.20 ? 0.10 : 0) +
            <br />
            &nbsp;&nbsp;(top_supplier &gt; 0.50 ? 0.10 : 0) +
            <br />
            &nbsp;&nbsp;(zscore_party &gt; 2 ? 0.08 : 0) +
            <br />
            &nbsp;&nbsp;(zscore_state &gt; 2 ? 0.08 : 0),
            <br />
            &nbsp;&nbsp;1.0
            <br />)
          </code>
        </div>
        <div className="mt-3 text-sm text-text-muted">
          <p>Onde base_hhi varia conforme nivel de concentracao:</p>
          <ul className="mt-1 space-y-0.5">
            <li>• CRITICO (HHI &gt; 3000): 0.90</li>
            <li>• ALTO (HHI 2500-3000): 0.70</li>
            <li>• MEDIO (HHI 1500-2500): 0.40</li>
            <li>• BAIXO (HHI &lt; 1500): 0.20</li>
          </ul>
        </div>
      </div>

      {/* Complete Field Glossary */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Glossario de Campos
        </h3>
        <FieldGlossary searchable />
      </div>
    </div>
  );
}

// Helper components
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function RelationshipCard({
  source,
  target,
  type,
  description,
}: {
  source: string;
  target: string;
  type: string;
  description: string;
}) {
  return (
    <div className="bg-bg-secondary p-3 rounded-lg">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-mono text-accent-teal">{source}</span>
        <span className="text-text-muted">→</span>
        <span className="font-mono text-accent-blue">{target}</span>
        <span className="text-xs bg-bg-tertiary px-2 py-0.5 rounded text-text-muted">{type}</span>
      </div>
      <p className="text-xs text-text-secondary mt-1">{description}</p>
    </div>
  );
}

function FileReferenceRow({
  filename,
  size,
  records,
  description,
}: {
  filename: string;
  size: string;
  records: number | string;
  description: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3">
        <code className="text-accent-teal font-mono text-sm">{filename}</code>
        <span className="text-xs text-text-muted">{size}</span>
        <span className="text-xs text-text-muted">({records} registros)</span>
      </div>
      <p className="text-xs text-text-secondary sm:ml-auto">{description}</p>
    </div>
  );
}
