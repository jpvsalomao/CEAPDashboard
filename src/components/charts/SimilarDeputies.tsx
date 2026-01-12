import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Deputy } from '../../types/data';
import { formatReais } from '../../utils/formatters';
import { getRiskLevelColor } from '../../utils/colors';

interface SimilarDeputiesProps {
  deputy: Deputy;
  allDeputies: Deputy[];
  maxResults?: number;
}

interface SimilarityResult {
  deputy: Deputy;
  score: number;
  reasons: string[];
}

// Calculate cosine similarity between two category distributions
function calculateCategorySimilarity(a: Deputy, b: Deputy): number {
  if (!a.byCategory?.length || !b.byCategory?.length) return 0;

  // Create vectors of category percentages
  const allCategories = new Set([
    ...a.byCategory.map(c => c.category),
    ...b.byCategory.map(c => c.category),
  ]);

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (const cat of allCategories) {
    const pctA = a.byCategory.find(c => c.category === cat)?.pct || 0;
    const pctB = b.byCategory.find(c => c.category === cat)?.pct || 0;

    dotProduct += pctA * pctB;
    magnitudeA += pctA * pctA;
    magnitudeB += pctB * pctB;
  }

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

// Calculate similarity score between two deputies
function calculateSimilarity(target: Deputy, candidate: Deputy): SimilarityResult | null {
  // Skip same deputy
  if (target.id === candidate.id) return null;

  // Skip if not enough transactions
  if (candidate.transactionCount < 10) return null;

  let score = 0;
  const reasons: string[] = [];

  // 1. Same party (weight: 15)
  if (target.party === candidate.party) {
    score += 15;
    reasons.push(`Mesmo partido (${target.party})`);
  }

  // 2. Same state (weight: 15)
  if (target.uf === candidate.uf) {
    score += 15;
    reasons.push(`Mesmo estado (${target.uf})`);
  }

  // 3. Similar total spending (weight: 25)
  const spendingRatio = Math.min(target.totalSpending, candidate.totalSpending) /
    Math.max(target.totalSpending, candidate.totalSpending);
  if (spendingRatio > 0.7) {
    const spendingScore = Math.round(spendingRatio * 25);
    score += spendingScore;
    reasons.push(`Gasto similar (${(spendingRatio * 100).toFixed(0)}% próximo)`);
  }

  // 4. Similar HHI (weight: 20)
  const hhiDiff = Math.abs(target.hhi.value - candidate.hhi.value);
  const hhiSimilarity = Math.max(0, 1 - hhiDiff / 3000);
  if (hhiSimilarity > 0.6) {
    const hhiScore = Math.round(hhiSimilarity * 20);
    score += hhiScore;
    reasons.push(`HHI similar (${candidate.hhi.value.toFixed(0)})`);
  }

  // 5. Category distribution similarity (weight: 25)
  const categorySimilarity = calculateCategorySimilarity(target, candidate);
  if (categorySimilarity > 0.7) {
    const catScore = Math.round(categorySimilarity * 25);
    score += catScore;
    reasons.push(`Distribuição de categorias similar (${(categorySimilarity * 100).toFixed(0)}%)`);
  }

  // Require minimum score
  if (score < 30 || reasons.length < 2) return null;

  return {
    deputy: candidate,
    score,
    reasons,
  };
}

export function SimilarDeputies({
  deputy,
  allDeputies,
  maxResults = 5,
}: SimilarDeputiesProps) {
  const similarDeputies = useMemo(() => {
    if (allDeputies.length === 0) return [];

    const results: SimilarityResult[] = [];

    for (const candidate of allDeputies) {
      const result = calculateSimilarity(deputy, candidate);
      if (result) {
        results.push(result);
      }
    }

    // Sort by score descending
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }, [deputy, allDeputies, maxResults]);

  if (similarDeputies.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Deputados Similares
          </h3>
          <p className="text-sm text-text-muted">
            Deputados com padrões de gastos similares
          </p>
        </div>
        <div className="p-6 bg-bg-secondary/50 rounded-lg text-center">
          <p className="text-text-secondary">
            Nenhum deputado com perfil similar encontrado.
          </p>
          <p className="text-sm text-text-muted mt-1">
            Isso pode indicar um padrão de gastos único.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-text-primary">
          Deputados Similares
        </h3>
        <p className="text-sm text-text-muted">
          {similarDeputies.length} deputados com padrões de gastos similares a {deputy.name.split(' ')[0]}
        </p>
      </div>

      <div className="space-y-3">
        {similarDeputies.map((result, idx) => (
          <Link
            key={result.deputy.id}
            to={`/deputados/${result.deputy.id}`}
            className="block p-4 bg-bg-secondary rounded-lg hover:bg-bg-card transition-colors group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Rank */}
                <span className="w-6 h-6 rounded-full bg-accent-teal/20 text-accent-teal text-xs flex items-center justify-center font-medium flex-shrink-0">
                  {idx + 1}
                </span>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-bg-card flex items-center justify-center text-lg font-semibold text-text-secondary flex-shrink-0">
                  {result.deputy.name.charAt(0)}
                </div>

                {/* Info */}
                <div className="min-w-0">
                  <p className="font-medium text-text-primary group-hover:text-accent-teal transition-colors truncate">
                    {result.deputy.name}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {result.deputy.party}-{result.deputy.uf}
                  </p>
                </div>
              </div>

              {/* Score and spending */}
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent-teal/20 text-accent-teal">
                    {result.score}% similar
                  </span>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getRiskLevelColor(result.deputy.riskLevel) }}
                    title={`Risco: ${result.deputy.riskLevel}`}
                  />
                </div>
                <p className="text-sm text-text-muted mt-1 font-mono">
                  {formatReais(result.deputy.totalSpending, true)}
                </p>
              </div>
            </div>

            {/* Reasons */}
            <div className="mt-3 flex flex-wrap gap-2">
              {result.reasons.slice(0, 3).map((reason, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 bg-bg-card rounded text-text-muted"
                >
                  {reason}
                </span>
              ))}
              {result.reasons.length > 3 && (
                <span className="text-xs px-2 py-1 text-text-muted">
                  +{result.reasons.length - 3} mais
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      <p className="text-xs text-text-muted">
        Similaridade calculada com base em: partido, estado, total de gastos, concentração de fornecedores (HHI)
        e distribuição de categorias de despesas.
      </p>
    </div>
  );
}
