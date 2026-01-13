/**
 * SpotlightDebate - Two-column debate renderer with voting
 * Shows prosecutor vs defense analysis with audience engagement
 */

import { useState } from 'react';
import type { DebateContent } from '../../pages/spotlight/SpotlightContent';

interface SpotlightDebateProps {
  debate: DebateContent;
  slug: string;
}

type VoteOption = 'investigar' | 'inconclusivo' | null;

export function SpotlightDebate({ debate, slug }: SpotlightDebateProps) {
  const [vote, setVote] = useState<VoteOption>(null);
  const [hasVoted, setHasVoted] = useState(false);

  // Check localStorage for previous vote
  useState(() => {
    const storedVote = localStorage.getItem(`spotlight-vote-${slug}`);
    if (storedVote) {
      setVote(storedVote as VoteOption);
      setHasVoted(true);
    }
  });

  const handleVote = (option: VoteOption) => {
    if (hasVoted) return;
    setVote(option);
    setHasVoted(true);
    localStorage.setItem(`spotlight-vote-${slug}`, option || '');
  };

  return (
    <div className="space-y-8">
      {/* Two columns: Promotor | Defesa */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Promotor (amber/warning accent) */}
        <div className="bg-accent-amber/10 rounded-lg p-6 border-l-4 border-accent-amber">
          <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
            <span>⚠️</span>
            {debate.promotor.title}
          </h3>
          <p className="text-sm text-text-secondary mb-4 leading-relaxed">
            {debate.promotor.centralArgument}
          </p>
          <div className="space-y-3">
            {debate.promotor.evidence.map((ev, i) => (
              <div key={i} className="bg-bg-primary/50 rounded p-3">
                <h4 className="text-sm font-medium text-text-primary mb-1">
                  {ev.title}
                </h4>
                <p className="text-xs text-text-muted">{ev.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Defesa (teal accent) */}
        <div className="bg-accent-teal/10 rounded-lg p-6 border-l-4 border-accent-teal">
          <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
            <span>🛡️</span>
            {debate.defesa.title}
          </h3>
          <p className="text-sm text-text-secondary mb-4 leading-relaxed">
            {debate.defesa.centralArgument}
          </p>
          <div className="space-y-3">
            {debate.defesa.counterpoints.map((cp, i) => (
              <div key={i} className="bg-bg-primary/50 rounded p-3">
                <h4 className="text-sm font-medium text-text-primary mb-1">
                  Re: {cp.allegation}
                </h4>
                <p className="text-xs text-text-muted">{cp.alternative}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Open Questions */}
      <div className="bg-bg-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <span>❓</span>
          Perguntas em Aberto
        </h3>
        <p className="text-sm text-text-muted mb-4">
          Estas questoes so podem ser respondidas com investigacao formal ou acesso a documentos nao publicos:
        </p>
        <ul className="space-y-2">
          {debate.openQuestions.map((q, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
              <span className="text-accent-blue mt-0.5">•</span>
              {q}
            </li>
          ))}
        </ul>
      </div>

      {/* Vote CTA */}
      <div className="bg-accent-blue/10 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-2 text-center flex items-center justify-center gap-2">
          <span>🗳️</span>
          E voce, o que acha?
        </h3>
        <p className="text-sm text-text-muted text-center mb-4">
          Com base nos dados apresentados, qual sua conclusao?
        </p>

        {!hasVoted ? (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => handleVote('investigar')}
              className="px-6 py-3 bg-accent-amber/20 hover:bg-accent-amber/30 text-accent-amber rounded-lg transition font-medium text-sm"
            >
              Os dados justificam investigacao
            </button>
            <button
              onClick={() => handleVote('inconclusivo')}
              className="px-6 py-3 bg-accent-teal/20 hover:bg-accent-teal/30 text-accent-teal rounded-lg transition font-medium text-sm"
            >
              Os dados sao inconclusivos
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-bg-secondary rounded-lg text-sm">
              <span className="text-accent-teal">✓</span>
              <span className="text-text-secondary">
                Voce votou: {vote === 'investigar' ? 'Justifica investigacao' : 'Dados inconclusivos'}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-2">
              Obrigado por participar! Seu voto foi registrado localmente.
            </p>
          </div>
        )}
      </div>

      {/* Educational Takeaway */}
      <div className="bg-bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
          <span>💡</span>
          O Que Aprendemos
        </h3>
        <div className="space-y-3 text-sm text-text-secondary">
          <p>
            <strong className="text-text-primary">1. Dados publicos permitem verificacao:</strong>{' '}
            Qualquer cidadao pode conferir gastos parlamentares no Portal de Dados Abertos da Camara.
          </p>
          <p>
            <strong className="text-text-primary">2. Numeros precisam de contexto:</strong>{' '}
            Um p-value baixo ou concentracao em fornecedor nao sao, por si so, prova de irregularidade.
          </p>
          <p>
            <strong className="text-text-primary">3. Analise honesta reconhece incertezas:</strong>{' '}
            Faltam dados para conclusao definitiva. Transparencia real exigiria acesso a contratos e agendas.
          </p>
        </div>
      </div>
    </div>
  );
}
