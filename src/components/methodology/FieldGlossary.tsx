import { useState, useMemo } from 'react';

interface FieldDefinition {
  field: string;
  type: string;
  entity: string;
  description: string;
  example?: string;
}

// Complete field glossary based on src/types/data.ts
const FIELD_DEFINITIONS: FieldDefinition[] = [
  // Deputy entity
  { field: 'id', type: 'number', entity: 'Deputy', description: 'ID unico do deputado na API da Camara', example: '204521' },
  { field: 'name', type: 'string', entity: 'Deputy', description: 'Nome parlamentar do deputado', example: 'Joao Silva' },
  { field: 'party', type: 'string', entity: 'Deputy', description: 'Sigla do partido politico', example: 'PT, PL, MDB' },
  { field: 'uf', type: 'string', entity: 'Deputy', description: 'Unidade federativa (estado)', example: 'SP, RJ, MG' },
  { field: 'totalSpending', type: 'number', entity: 'Deputy', description: 'Valor total gasto em R$ no periodo', example: '1.234.567,89' },
  { field: 'transactionCount', type: 'number', entity: 'Deputy', description: 'Numero total de transacoes/notas fiscais', example: '523' },
  { field: 'avgTicket', type: 'number', entity: 'Deputy', description: 'Valor medio por transacao (totalSpending/transactionCount)', example: '2.361,50' },
  { field: 'supplierCount', type: 'number', entity: 'Deputy', description: 'Quantidade de fornecedores unicos utilizados', example: '45' },
  { field: 'hhi.value', type: 'number', entity: 'Deputy', description: 'Indice HHI de concentracao de fornecedores (0-10000)', example: '2500' },
  { field: 'hhi.level', type: 'RiskLevel', entity: 'Deputy', description: 'Nivel de risco baseado no HHI', example: 'MEDIO' },
  { field: 'benford.chi2', type: 'number', entity: 'Deputy', description: 'Estatistica qui-quadrado do teste de Benford', example: '15.23' },
  { field: 'benford.pValue', type: 'number', entity: 'Deputy', description: 'Valor-p do teste de Benford', example: '0.0234' },
  { field: 'benford.significant', type: 'boolean', entity: 'Deputy', description: 'Se o desvio de Benford e estatisticamente significativo', example: 'true' },
  { field: 'roundValuePct', type: 'number', entity: 'Deputy', description: 'Percentual de valores redondos (divisiveis por 100)', example: '23.5' },
  { field: 'riskScore', type: 'number', entity: 'Deputy', description: 'Score de risco composto (0.0 a 1.0)', example: '0.72' },
  { field: 'riskLevel', type: 'RiskLevel', entity: 'Deputy', description: 'Nivel de risco final: CRITICO, ALTO, MEDIO, BAIXO', example: 'ALTO' },
  { field: 'zScoreParty', type: 'number', entity: 'Deputy', description: 'Desvios-padrao da media do partido', example: '2.3' },
  { field: 'zScoreState', type: 'number', entity: 'Deputy', description: 'Desvios-padrao da media do estado', example: '1.8' },

  // Aggregations entity
  { field: 'meta.totalTransactions', type: 'number', entity: 'Aggregations', description: 'Total de transacoes no periodo', example: '630.552' },
  { field: 'meta.totalSpending', type: 'number', entity: 'Aggregations', description: 'Soma total de gastos em R$', example: '686.357.427,01' },
  { field: 'meta.totalDeputies', type: 'number', entity: 'Aggregations', description: 'Numero de deputados com gastos', example: '847' },
  { field: 'meta.totalSuppliers', type: 'number', entity: 'Aggregations', description: 'Total de fornecedores unicos', example: '41.004' },
  { field: 'meta.period', type: 'object', entity: 'Aggregations', description: 'Periodo coberto pelos dados (start/end)', example: '2023-01 a 2025-09' },

  // FraudFlag entity
  { field: 'deputyId', type: 'number', entity: 'FraudFlag', description: 'ID do deputado associado', example: '204521' },
  { field: 'flags', type: 'string[]', entity: 'FraudFlag', description: 'Lista de alertas ativos para o deputado', example: '["HHI_ALTO", "BENFORD"]' },
  { field: 'details.benfordDeviation', type: 'boolean', entity: 'FraudFlag', description: 'Indica desvio significativo de Benford', example: 'true' },
  { field: 'details.roundValuePct', type: 'number', entity: 'FraudFlag', description: 'Percentual de valores redondos', example: '28.3' },
  { field: 'details.supplierConcentration', type: 'boolean', entity: 'FraudFlag', description: 'Indica concentracao alta em poucos fornecedores', example: 'true' },
  { field: 'details.cnpjMismatches', type: 'number', entity: 'FraudFlag', description: 'Quantidade de incompatibilidades CNPJ/CNAE', example: '3' },
  { field: 'details.weekendPct', type: 'number', entity: 'FraudFlag', description: 'Percentual de gastos em fins de semana', example: '12.5' },

  // CNPJMismatch entity
  { field: 'cnpj', type: 'string', entity: 'CNPJMismatch', description: 'CNPJ do fornecedor com mismatch', example: '12.345.678/0001-90' },
  { field: 'razaoSocial', type: 'string', entity: 'CNPJMismatch', description: 'Razao social da empresa', example: 'Clinica Medica Ltda' },
  { field: 'expenseCategory', type: 'string', entity: 'CNPJMismatch', description: 'Categoria de despesa declarada', example: 'DIVULGACAO DA ATIVIDADE' },
  { field: 'cnaePrincipal', type: 'string', entity: 'CNPJMismatch', description: 'Codigo e descricao CNAE da empresa', example: '8630-5/01 - Atividade medica' },
  { field: 'reason', type: 'string', entity: 'CNPJMismatch', description: 'Motivo da incompatibilidade identificada', example: 'Atividade incompativel com categoria' },

  // SupplierShare entity
  { field: 'name', type: 'string', entity: 'SupplierShare', description: 'Nome do fornecedor', example: 'Auto Locadora XYZ' },
  { field: 'cnpj', type: 'string', entity: 'SupplierShare', description: 'CNPJ do fornecedor', example: '12.345.678/0001-90' },
  { field: 'value', type: 'number', entity: 'SupplierShare', description: 'Valor total pago ao fornecedor', example: '234.567,00' },
  { field: 'pct', type: 'number', entity: 'SupplierShare', description: 'Percentual do total de gastos do deputado', example: '45.2' },

  // RiskLevel enum
  { field: 'RiskLevel', type: 'enum', entity: 'Tipo', description: 'Niveis de risco possiveis no sistema', example: 'CRITICO | ALTO | MEDIO | BAIXO' },
];

interface FieldGlossaryProps {
  searchable?: boolean;
  maxRows?: number;
}

export function FieldGlossary({ searchable = true, maxRows }: FieldGlossaryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  const entities = useMemo(() => {
    const uniqueEntities = [...new Set(FIELD_DEFINITIONS.map((f) => f.entity))];
    return ['all', ...uniqueEntities];
  }, []);

  const filteredFields = useMemo(() => {
    let fields = FIELD_DEFINITIONS;

    if (entityFilter !== 'all') {
      fields = fields.filter((f) => f.entity === entityFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      fields = fields.filter(
        (f) =>
          f.field.toLowerCase().includes(term) ||
          f.description.toLowerCase().includes(term) ||
          f.entity.toLowerCase().includes(term)
      );
    }

    if (maxRows) {
      fields = fields.slice(0, maxRows);
    }

    return fields;
  }, [searchTerm, entityFilter, maxRows]);

  const totalFields = FIELD_DEFINITIONS.length;

  return (
    <div className="space-y-4">
      {/* Search and filter controls */}
      {searchable && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar campo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-teal text-sm"
            />
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          </div>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-teal"
          >
            {entities.map((entity) => (
              <option key={entity} value={entity}>
                {entity === 'all' ? 'Todas entidades' : entity}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Stats */}
      <div className="text-xs text-text-muted">
        {filteredFields.length} de {totalFields} campos
        {entityFilter !== 'all' && ` em ${entityFilter}`}
      </div>

      {/* Table */}
      <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-3 px-2 text-left text-text-muted font-medium">Campo</th>
              <th className="py-3 px-2 text-left text-text-muted font-medium">Tipo</th>
              <th className="py-3 px-2 text-left text-text-muted font-medium hidden sm:table-cell">
                Entidade
              </th>
              <th className="py-3 px-2 text-left text-text-muted font-medium">Descricao</th>
            </tr>
          </thead>
          <tbody>
            {filteredFields.map((field, idx) => (
              <tr
                key={`${field.entity}-${field.field}`}
                className={`border-b border-border/50 hover:bg-bg-secondary/50 ${
                  idx % 2 === 0 ? 'bg-transparent' : 'bg-bg-secondary/20'
                }`}
              >
                <td className="py-2 px-2">
                  <code className="text-accent-teal font-mono text-xs">{field.field}</code>
                </td>
                <td className="py-2 px-2">
                  <span className="text-text-secondary font-mono text-xs">{field.type}</span>
                </td>
                <td className="py-2 px-2 hidden sm:table-cell">
                  <span className="text-text-muted text-xs">{field.entity}</span>
                </td>
                <td className="py-2 px-2">
                  <span className="text-text-secondary text-xs">{field.description}</span>
                  {field.example && (
                    <span className="block text-text-muted text-xs mt-0.5">
                      Ex: {field.example}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {maxRows && filteredFields.length >= maxRows && (
        <p className="text-xs text-text-muted text-center">
          Mostrando {maxRows} de {totalFields} campos
        </p>
      )}
    </div>
  );
}

// Simple search icon
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}
