/**
 * SpotlightInvestigationTimeline - Linha do tempo completa da investigação
 * Mostra progressão cronológica com contexto de fundo
 */

import { useState } from 'react';
import { formatReais } from '../../utils/formatters';

interface Phase {
  phase: number;
  date: string;
  title: string;
  description: string;
  mandados?: number;
  prisoes?: number;
  bloqueio?: number | null;
  alvos?: string[];
  municipios?: string[];
  apreensoes?: string;
  highlight?: boolean;
}

interface Props {
  phases: Phase[];
  totalBlocked: number;
  states?: number;
}

export function SpotlightInvestigationTimeline({ phases, totalBlocked, states = 17 }: Props) {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [showBackground, setShowBackground] = useState(true);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const togglePhase = (phase: number) => {
    setExpandedPhase(expandedPhase === phase ? null : phase);
  };

  return (
    <div className="bg-bg-secondary rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">&#x1f4c5;</span>
          <h3 className="text-lg font-semibold text-text-primary">A Cronologia da Operação</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted">Total bloqueado</p>
          <p className="text-lg font-bold text-accent-red">{formatReais(totalBlocked, { noCents: true })}</p>
        </div>
      </div>

      {/* Toggle do contexto */}
      <div className="mb-6">
        <button
          onClick={() => setShowBackground(!showBackground)}
          className="w-full text-left p-4 bg-bg-card rounded-lg border border-border hover:border-accent-teal/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{'\u{1F4D6}'}</span>
              <span className="font-medium text-text-primary">Como tudo começou</span>
            </div>
            <span className={`text-text-muted transition-transform ${showBackground ? 'rotate-180' : ''}`}>
              &#x25BC;
            </span>
          </div>
        </button>

        {showBackground && (
          <div className="mt-3 p-4 bg-bg-card rounded-lg border-l-4 border-accent-teal">
            <div className="space-y-3 text-sm text-text-secondary">
              <p>
                <strong className="text-text-primary">O Esquema:</strong> A Operação Overclean investiga
                um suposto esquema de desvio de <strong className="text-accent-amber">R$ 1,4 bilhão</strong>{' '}
                em recursos públicos, operando através de empresas de limpeza urbana e resíduos sólidos.
              </p>
              <p>
                <strong className="text-text-primary">O "Rei do Lixo":</strong> José Marcos de Moura,
                empresário do setor de limpeza urbana, é apontado como figura central. Suas empresas
                atuam em <strong>17 estados</strong> e teriam movimentado R$ 861 milhões em transações suspeitas.
              </p>
              <p>
                <strong className="text-text-primary">O Modus Operandi:</strong> Segundo a PF, o esquema
                funcionava assim: deputados federais direcionavam emendas para municípios aliados, que
                contratavam empresas ligadas ao grupo sem licitação ou com licitações fraudadas.
                Parte do dinheiro retornaria como propina.
              </p>
              <p>
                <strong className="text-text-primary">A Conexão Baiana:</strong> A Bahia é o epicentro
                da investigação. Félix Mendonça Júnior (PDT) e Elmar Nascimento (União Brasil) são
                os principais alvos, junto com prefeitos de vários municípios da região.
              </p>
              <div className="mt-4 p-3 bg-accent-amber/10 rounded text-xs">
                <span className="font-medium text-accent-amber">{'\u{26A0}'} Importante:</span>
                <span className="text-text-secondary ml-1">
                  Todas as pessoas citadas negam as acusações. A investigação está em andamento e
                  ninguém foi condenado. Presunção de inocência se aplica.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Estatísticas resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-bg-card rounded p-3 text-center">
          <p className="text-xl sm:text-2xl font-bold text-text-primary">{phases.length}</p>
          <p className="text-xs text-text-muted">Fases</p>
        </div>
        <div className="bg-bg-card rounded p-3 text-center">
          <p className="text-xl sm:text-2xl font-bold text-text-primary">
            {phases.reduce((sum, p) => sum + (p.mandados || 0), 0)}
          </p>
          <p className="text-xs text-text-muted">Mandados</p>
        </div>
        <div className="bg-bg-card rounded p-3 text-center">
          <p className="text-xl sm:text-2xl font-bold text-text-primary">
            {phases.reduce((sum, p) => sum + (p.prisoes || 0), 0)}
          </p>
          <p className="text-xs text-text-muted">Prisões</p>
        </div>
        <div className="bg-bg-card rounded p-3 text-center">
          <p className="text-xl sm:text-2xl font-bold text-accent-amber">{states}</p>
          <p className="text-xs text-text-muted">Estados</p>
        </div>
      </div>

      {/* Introdução da linha do tempo */}
      <p className="text-sm text-text-secondary mb-4">
        De dezembro de 2024 a janeiro de 2026, a PF executou 9 fases da operação.
        Clique em cada fase para ver detalhes.
      </p>

      {/* Linha do tempo */}
      <div className="relative">
        {/* Linha vertical */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-3">
          {phases.map((phase, idx) => {
            const isExpanded = expandedPhase === phase.phase;
            const isLast = idx === phases.length - 1;

            return (
              <div key={phase.phase} className="relative">
                {/* Ponto na linha do tempo */}
                <div
                  className={`absolute left-4 w-3 h-3 rounded-full -translate-x-1/2 border-2 z-10 ${
                    phase.highlight || isLast
                      ? 'bg-accent-amber border-accent-amber'
                      : 'bg-bg-secondary border-text-muted'
                  }`}
                  style={{ top: '1.25rem' }}
                />

                {/* Conteúdo */}
                <div
                  className={`ml-8 p-4 rounded-lg cursor-pointer transition-all ${
                    phase.highlight || isLast
                      ? 'bg-bg-card border border-accent-amber/30'
                      : 'bg-bg-card hover:bg-bg-card/80'
                  }`}
                  onClick={() => togglePhase(phase.phase)}
                >
                  {/* Cabeçalho */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          phase.highlight || isLast
                            ? 'bg-accent-amber/20 text-accent-amber'
                            : 'bg-bg-secondary text-text-muted'
                        }`}>
                          Fase {phase.phase}
                        </span>
                        <span className="text-xs text-text-muted">{formatDate(phase.date)}</span>
                        {phase.bloqueio && (
                          <span className="text-xs text-text-secondary font-medium">
                            {formatReais(phase.bloqueio, { noCents: true })} bloqueados
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-text-primary">{phase.title}</h4>
                    </div>
                    <span className={`text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      &#x25BC;
                    </span>
                  </div>

                  {/* Resumo colapsado */}
                  {!isExpanded && (
                    <p className="text-sm text-text-secondary mt-2 line-clamp-1">
                      {phase.description}
                    </p>
                  )}

                  {/* Detalhes expandidos */}
                  {isExpanded && (
                    <div className="mt-3 space-y-3">
                      <p className="text-sm text-text-secondary">{phase.description}</p>

                      {/* Linha de estatísticas */}
                      <div className="flex items-center gap-4 text-xs">
                        {phase.mandados !== undefined && phase.mandados > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="text-text-muted">&#x1f4cb;</span>
                            <span className="text-text-primary font-medium">{phase.mandados}</span>
                            <span className="text-text-muted">mandados</span>
                          </span>
                        )}
                        {phase.prisoes !== undefined && phase.prisoes > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="text-text-muted">&#x1f6a8;</span>
                            <span className="text-text-primary font-medium">{phase.prisoes}</span>
                            <span className="text-text-muted">prisões</span>
                          </span>
                        )}
                      </div>

                      {/* Alvos */}
                      {phase.alvos && phase.alvos.length > 0 && (
                        <div>
                          <p className="text-xs text-text-muted mb-1">Alvos:</p>
                          <div className="flex flex-wrap gap-1">
                            {phase.alvos.map((alvo, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-bg-secondary text-xs text-text-primary rounded"
                              >
                                {alvo}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Municípios */}
                      {phase.municipios && phase.municipios.length > 0 && (
                        <div>
                          <p className="text-xs text-text-muted mb-1">Municípios:</p>
                          <div className="flex flex-wrap gap-1">
                            {phase.municipios.map((mun, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-bg-secondary text-xs text-text-secondary rounded"
                              >
                                {mun}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Apreensões */}
                      {phase.apreensoes && (
                        <div className="p-2 bg-bg-secondary rounded text-xs text-text-secondary">
                          <span className="font-medium text-text-primary">Apreensões: </span>
                          {phase.apreensoes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rodapé com fontes */}
      <div className="mt-6 p-3 bg-bg-card rounded-lg">
        <p className="text-xs text-text-muted text-center">
          <strong>Fontes:</strong> Agência Brasil, G1, Metrópoles, Folha de S.Paulo, UOL
        </p>
        <p className="text-xs text-text-muted/70 text-center mt-1">
          Datas e valores verificados em múltiplas fontes jornalísticas
        </p>
      </div>
    </div>
  );
}
