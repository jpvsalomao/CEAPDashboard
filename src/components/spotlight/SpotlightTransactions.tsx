/**
 * SpotlightTransactions - Display key transactions with verification status
 * Shows the specific transactions mentioned in news with data confirmation
 */

import { formatReais } from '../../utils/formatters';

export interface HighlightTransaction {
  date: string;
  supplier: string;
  category: string;
  documentValue: number;
  reimbursedValue: number;
  highlight?: boolean;
  verificationNote?: string;
  documentUrl?: string;
}

interface TransactionGroup {
  title: string;
  icon: string;
  transactions: HighlightTransaction[];
  total?: number;
}

interface SpotlightTransactionsProps {
  groups: TransactionGroup[];
  periodLabel: string;
  periodTotal: number;
}

export function SpotlightTransactions({
  groups,
  periodLabel,
  periodTotal,
}: SpotlightTransactionsProps) {
  return (
    <div className="bg-bg-secondary rounded-lg p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="font-semibold text-text-primary flex items-center gap-2">
            <span>📋</span>
            Transações Verificadas
          </h3>
          <p className="text-xs text-text-muted mt-1">{periodLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-text-primary">{formatReais(periodTotal)}</p>
          <p className="text-xs text-text-muted">Total do período</p>
        </div>
      </div>

      <div className="space-y-6">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex}>
            <div className="flex items-center gap-2 mb-3">
              <span>{group.icon}</span>
              <h4 className="text-sm font-medium text-text-primary">{group.title}</h4>
              {group.total !== undefined && (
                <span className="text-xs text-text-muted ml-auto">
                  {formatReais(group.total)}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {group.transactions.map((tx, txIndex) => (
                <div
                  key={txIndex}
                  className={`rounded-lg p-3 ${
                    tx.highlight
                      ? 'bg-accent-red/10 border border-accent-red/30'
                      : 'bg-bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-text-muted">{tx.date}</p>
                        {tx.highlight && (
                          <span className="px-1.5 py-0.5 bg-accent-red/20 text-accent-red text-[10px] rounded">
                            Confirmado
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-primary mt-0.5 truncate">
                        {tx.supplier}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">{tx.category}</p>
                      {tx.verificationNote && (
                        <p className="text-xs text-accent-amber mt-1 italic">
                          {tx.verificationNote}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {tx.documentValue !== tx.reimbursedValue ? (
                        <>
                          <p className="text-xs text-text-muted line-through">
                            {formatReais(tx.documentValue)}
                          </p>
                          <p className="text-sm font-medium text-text-primary">
                            {formatReais(tx.reimbursedValue)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-text-primary">
                          {formatReais(tx.reimbursedValue)}
                        </p>
                      )}
                      {tx.documentUrl && (
                        <a
                          href={tx.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-accent-teal hover:underline"
                        >
                          Ver documento
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Source note */}
      <div className="mt-6 pt-4 border-t border-border">
        <p className="text-[10px] text-text-muted text-center">
          Dados extraídos do Portal de Dados Abertos da Câmara dos Deputados.
          Links direcionam para documentos oficiais quando disponíveis.
        </p>
      </div>
    </div>
  );
}
