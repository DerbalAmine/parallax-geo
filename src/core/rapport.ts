/**
 * Assemblage du rapport final — conforme au schéma JSON de sortie de
 * docs/scoring-methodology.md (score global normalisé, plafond, niveaux,
 * critères non testés listés à part, recommandations priorisées).
 */

import { buildRecommandations } from './recommendations.js';
import { computeScore } from './scoring.js';
import type { PilierId, PilierResult, Rapport } from './types.js';

export interface RapportInput {
  url: string;
  piliers: Record<PilierId, PilierResult>;
  auditedAt?: Date;
  /** Métadonnée 4.4 — détection de langue non implémentée en v1. */
  langueDetectee?: string;
}

export function buildRapport(input: RapportInput): Rapport {
  const score = computeScore(input.piliers);
  return {
    url: input.url,
    audited_at: (input.auditedAt ?? new Date()).toISOString(),
    langue_detectee: input.langueDetectee ?? 'indeterminee',
    score_global: score.score_global,
    score_brut: score.score_brut,
    score_max_teste: score.score_max_teste,
    niveau: score.niveau,
    plafond_applique: score.plafond_applique,
    piliers: input.piliers,
    criteres_non_testes: score.criteres_non_testes,
    recommandations: buildRecommandations(input.piliers),
  };
}
