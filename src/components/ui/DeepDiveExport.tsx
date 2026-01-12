import { useState, useRef } from 'react';
import type { Deputy } from '../../types/data';
import { formatReais, formatNumber, formatPercent } from '../../utils/formatters';

interface DeepDiveExportProps {
  deputy: Deputy;
  deepDiveTitle: string;
}

type ExportFormat = 'csv' | 'json' | 'txt';

export function DeepDiveExport({ deputy, deepDiveTitle }: DeepDiveExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const generateFilename = (ext: string) => {
    const slug = deputy.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const date = new Date().toISOString().split('T')[0];
    return `ceap-deepdive-${slug}-${date}.${ext}`;
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

  const exportAsCSV = () => {
    setExportingFormat('csv');
    setIsExporting(true);

    try {
      const rows: string[][] = [];

      // Header
      rows.push(['CEAP Deep Dive Report']);
      rows.push(['Deputado', deputy.name]);
      rows.push(['Partido', deputy.party]);
      rows.push(['Estado', deputy.uf]);
      rows.push(['Data do Relatorio', new Date().toLocaleDateString('pt-BR')]);
      rows.push([]);

      // Summary
      rows.push(['=== RESUMO ===']);
      rows.push(['Gasto Total', formatReais(deputy.totalSpending)]);
      rows.push(['Transações', formatNumber(deputy.transactionCount)]);
      rows.push(['Ticket Médio', formatReais(deputy.avgTicket)]);
      rows.push(['Fornecedores', formatNumber(deputy.supplierCount)]);
      rows.push(['HHI', deputy.hhi.value.toFixed(0)]);
      rows.push(['Nível de Risco', deputy.riskLevel]);
      rows.push([]);

      // Categories
      if (deputy.byCategory?.length) {
        rows.push(['=== GASTOS POR CATEGORIA ===']);
        rows.push(['Categoria', 'Valor', 'Percentual', 'Transações']);
        deputy.byCategory.forEach(cat => {
          rows.push([
            cat.category,
            formatReais(cat.value),
            formatPercent(cat.pct),
            formatNumber(cat.transactionCount),
          ]);
        });
        rows.push([]);
      }

      // Monthly
      if (deputy.byMonth?.length) {
        rows.push(['=== GASTOS MENSAIS ===']);
        rows.push(['Mês', 'Valor', 'Transações']);
        deputy.byMonth.forEach(month => {
          rows.push([month.month, formatReais(month.value), formatNumber(month.transactionCount)]);
        });
        rows.push([]);
      }

      // Suppliers
      if (deputy.topSuppliers?.length) {
        rows.push(['=== TOP FORNECEDORES ===']);
        rows.push(['Fornecedor', 'CNPJ', 'Valor', 'Percentual']);
        deputy.topSuppliers.forEach(supplier => {
          rows.push([
            supplier.name,
            supplier.cnpj || 'N/A',
            formatReais(supplier.value),
            formatPercent(supplier.pct),
          ]);
        });
        rows.push([]);
      }

      // Red flags
      if (deputy.redFlags?.length) {
        rows.push(['=== INDICADORES ===']);
        deputy.redFlags.forEach(flag => {
          rows.push([flag]);
        });
      }

      // Convert to CSV
      const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      downloadFile(csvContent, generateFilename('csv'), 'text/csv;charset=utf-8');
    } catch (error) {
      console.error('CSV export failed:', error);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
      setIsOpen(false);
    }
  };

  const exportAsJSON = () => {
    setExportingFormat('json');
    setIsExporting(true);

    try {
      const data = {
        reportMetadata: {
          title: deepDiveTitle,
          generatedAt: new Date().toISOString(),
          source: 'CEAP Dashboard - Dados Abertos da Câmara',
        },
        deputy: {
          id: deputy.id,
          name: deputy.name,
          party: deputy.party,
          uf: deputy.uf,
        },
        summary: {
          totalSpending: deputy.totalSpending,
          transactionCount: deputy.transactionCount,
          avgTicket: deputy.avgTicket,
          supplierCount: deputy.supplierCount,
          hhi: deputy.hhi,
          riskLevel: deputy.riskLevel,
          riskScore: deputy.riskScore,
          roundValuePct: deputy.roundValuePct,
        },
        benfordAnalysis: deputy.benford,
        categories: deputy.byCategory || [],
        monthlyData: deputy.byMonth || [],
        topSuppliers: deputy.topSuppliers || [],
        redFlags: deputy.redFlags || [],
      };

      const jsonContent = JSON.stringify(data, null, 2);
      downloadFile(jsonContent, generateFilename('json'), 'application/json');
    } catch (error) {
      console.error('JSON export failed:', error);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
      setIsOpen(false);
    }
  };

  const exportAsTXT = () => {
    setExportingFormat('txt');
    setIsExporting(true);

    try {
      const lines: string[] = [];

      lines.push('═'.repeat(60));
      lines.push('CEAP DEEP DIVE REPORT');
      lines.push('═'.repeat(60));
      lines.push('');
      lines.push(`Deputado: ${deputy.name}`);
      lines.push(`Partido: ${deputy.party} | Estado: ${deputy.uf}`);
      lines.push(`Data: ${new Date().toLocaleDateString('pt-BR')}`);
      lines.push('');
      lines.push('─'.repeat(60));
      lines.push('RESUMO FINANCEIRO');
      lines.push('─'.repeat(60));
      lines.push(`  Gasto Total:     ${formatReais(deputy.totalSpending)}`);
      lines.push(`  Transações:      ${formatNumber(deputy.transactionCount)}`);
      lines.push(`  Ticket Médio:    ${formatReais(deputy.avgTicket)}`);
      lines.push(`  Fornecedores:    ${formatNumber(deputy.supplierCount)}`);
      lines.push('');
      lines.push('─'.repeat(60));
      lines.push('INDICADORES DE CONCENTRAÇÃO');
      lines.push('─'.repeat(60));
      lines.push(`  Índice HHI:      ${deputy.hhi.value.toFixed(0)} (${deputy.hhi.level})`);
      lines.push(`  Valores Redondos: ${formatPercent(deputy.roundValuePct)}`);
      lines.push(`  Nível de Risco:  ${deputy.riskLevel}`);
      lines.push('');

      if (deputy.benford) {
        lines.push('─'.repeat(60));
        lines.push('ANÁLISE DE BENFORD');
        lines.push('─'.repeat(60));
        lines.push(`  Chi-quadrado:    ${deputy.benford.chi2.toFixed(2)}`);
        lines.push(`  p-valor:         ${deputy.benford.pValue.toFixed(4)}`);
        lines.push(`  Desvio signif.:  ${deputy.benford.significant ? 'Sim' : 'Não'}`);
        lines.push('');
      }

      if (deputy.topSuppliers?.length) {
        lines.push('─'.repeat(60));
        lines.push('TOP 5 FORNECEDORES');
        lines.push('─'.repeat(60));
        deputy.topSuppliers.slice(0, 5).forEach((s, i) => {
          lines.push(`  ${i + 1}. ${s.name}`);
          lines.push(`     ${formatReais(s.value)} (${formatPercent(s.pct)})`);
        });
        lines.push('');
      }

      if (deputy.redFlags?.length) {
        lines.push('─'.repeat(60));
        lines.push('INDICADORES IDENTIFICADOS');
        lines.push('─'.repeat(60));
        deputy.redFlags.forEach(flag => {
          lines.push(`  • ${flag}`);
        });
        lines.push('');
      }

      lines.push('═'.repeat(60));
      lines.push('Fonte: Portal de Dados Abertos da Camara dos Deputados');
      lines.push('Gerado por: CEAP Dashboard (A Escola de Dados)');
      lines.push('═'.repeat(60));

      const txtContent = lines.join('\n');
      downloadFile(txtContent, generateFilename('txt'), 'text/plain;charset=utf-8');
    } catch (error) {
      console.error('TXT export failed:', error);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
      setIsOpen(false);
    }
  };

  const exportOptions = [
    {
      format: 'csv' as ExportFormat,
      label: 'Planilha CSV',
      description: 'Dados tabulados para Excel',
      icon: '📊',
      action: exportAsCSV,
    },
    {
      format: 'json' as ExportFormat,
      label: 'Dados JSON',
      description: 'Formato estruturado para devs',
      icon: '{ }',
      action: exportAsJSON,
    },
    {
      format: 'txt' as ExportFormat,
      label: 'Relatorio TXT',
      description: 'Texto formatado simples',
      icon: '📄',
      action: exportAsTXT,
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary bg-bg-secondary hover:bg-bg-card border border-border rounded-lg transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span>Exportar</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-border">
              <p className="text-sm font-medium text-text-primary">Exportar Deep Dive</p>
              <p className="text-xs text-text-muted mt-0.5">{deputy.name}</p>
            </div>

            <div className="p-2">
              {exportOptions.map(option => (
                <button
                  key={option.format}
                  onClick={option.action}
                  disabled={isExporting}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-bg-secondary transition-colors disabled:opacity-50 text-left"
                >
                  <span className="text-lg w-6 text-center">
                    {isExporting && exportingFormat === option.format ? (
                      <div className="w-4 h-4 border-2 border-accent-teal border-t-transparent rounded-full animate-spin mx-auto" />
                    ) : (
                      option.icon
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{option.label}</p>
                    <p className="text-xs text-text-muted">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-2 border-t border-border bg-bg-secondary/50">
              <p className="text-[10px] text-text-muted text-center">
                Dados do Portal de Dados Abertos da Camara
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
