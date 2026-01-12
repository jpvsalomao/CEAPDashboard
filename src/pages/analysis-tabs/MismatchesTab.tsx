/**
 * Mismatches Tab Content
 * CNPJ/CNAE activity mismatch analysis
 */

import { formatReais, formatNumber, formatCNPJ } from '../../utils/formatters';

interface Mismatch {
  supplierName: string;
  cnpj: string;
  totalValue: number;
  transactionCount: number;
  deputyCount: number;
  reason: string;
}

interface MismatchesTabProps {
  mismatches: Mismatch[];
}

export function MismatchesTab({ mismatches }: MismatchesTabProps) {
  const totalPayments = mismatches.reduce((sum, m) => sum + m.totalValue, 0);
  const totalTransactions = mismatches.reduce((sum, m) => sum + m.transactionCount, 0);
  const totalDeputies = mismatches.reduce((sum, m) => sum + m.deputyCount, 0);

  return (
    <>
      {/* CNPJ Mismatches Table */}
      <div className="glass-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Empresas com Atividade Incompativel
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            CNPJs que receberam pagamentos em categorias incompativeis com sua atividade cadastrada (CNAE).
            Total: {formatNumber(mismatches.length)} empresas
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-bg-secondary">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                  Empresa
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">
                  CNPJ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                  Total Recebido
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden lg:table-cell">
                  Transacoes
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden lg:table-cell">
                  Deputados
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mismatches.slice(0, 20).map((mismatch, idx) => (
                <tr key={idx} className="hover:bg-bg-secondary/50">
                  <td className="px-4 py-3">
                    <div className="text-sm text-text-primary truncate max-w-[250px]">
                      {mismatch.supplierName}
                    </div>
                    <div className="text-xs text-text-muted truncate max-w-[250px] hidden lg:block">
                      {mismatch.reason}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="font-mono text-xs text-text-secondary">
                      {formatCNPJ(mismatch.cnpj)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-risk-critical">
                      {formatReais(mismatch.totalValue, true)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-text-secondary">
                      {formatNumber(mismatch.transactionCount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-text-secondary">
                      {mismatch.deputyCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {mismatches.length > 20 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-text-muted">
              Exibindo 20 de {formatNumber(mismatches.length)} empresas
            </p>
          </div>
        )}
      </div>

      {/* Summary Stats for Mismatches */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-text-muted mb-1">Total em Pagamentos</p>
          <p className="text-xl font-bold text-risk-critical">
            {formatReais(totalPayments, true)}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-text-muted mb-1">Total de Transacoes</p>
          <p className="text-xl font-bold text-text-primary">
            {formatNumber(totalTransactions)}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-text-muted mb-1">Deputados Envolvidos</p>
          <p className="text-xl font-bold text-text-primary">
            {totalDeputies}
          </p>
        </div>
      </div>
    </>
  );
}
