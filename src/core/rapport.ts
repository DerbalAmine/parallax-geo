/**
 * Assemblage du rapport final — conforme au schéma JSON de sortie de
 * docs/scoring-methodology.md : score de préparation GEO (Piliers 1-4,
 * normalisé, plafond, niveaux), citation mesurée (Pilier 5) rapportée à
 * part, critères non testés listés à part, recommandations priorisées.
 */

import { buildRecommandations } from './recommendations.js';
import { computeScore } from './scoring.js';
import type { CitationMesuree, PilierId, PilierResult, Rapport } from './types.js';
import { round1 } from './types.js';

/** Sous-ensemble des stats du Pilier 5 nécessaire au rapport (structurel,
 * pour ne pas créer de dépendance core → visibility). */
export interface CitationStats {
  totalReponses: number;
  citations: number;
  tauxCitation: number | null;
  positionMoyenne: number | null;
}

export interface RapportInput {
  url: string;
  piliers: Record<PilierId, PilierResult>;
  /** Stats du Pilier 5 quand il a tourné (auditVisibility). */
  citationStats?: CitationStats;
  auditedAt?: Date;
  langueDetectee?: string;
}

const RAISON_PREFIX = /^Non testé\s*:\s*/i;

function buildCitation(input: RapportInput): CitationMesuree {
  const pilier = input.piliers.visibilite_mesuree;
  const stats = input.citationStats;
  if (stats && stats.tauxCitation !== null) {
    return {
      statut: 'mesuree',
      reponses: stats.totalReponses,
      citations: stats.citations,
      taux: Math.round(stats.tauxCitation * 100) / 100,
      position_moyenne: stats.positionMoyenne,
      score: round1(pilier.score),
    };
  }
  const raison =
    pilier.details[0]?.preuve.replace(RAISON_PREFIX, '') ??
    'Pilier 5 non mesuré';
  return { statut: 'non_mesuree', raison };
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
    citation_mesuree: buildCitation(input),
    piliers: input.piliers,
    criteres_non_testes: score.criteres_non_testes,
    recommandations: buildRecommandations(input.piliers),
  };
}
