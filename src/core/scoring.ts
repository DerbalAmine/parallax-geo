/**
 * Formule globale — voir docs/scoring-methodology.md, section « Formule globale ».
 *
 * Score de préparation GEO = Piliers 1 à 4 uniquement ; le Pilier 5 (citation
 * mesurée) est rapporté à part, jamais additionné — il mesure la citation
 * réelle actuelle, pas un levier technique.
 *
 * Critères non testés : exclus du calcul. Le score sur 100 est normalisé sur
 * le total des points effectivement testés (score_brut / score_max_teste × 100),
 * pour qu'un audit palier 0 puisse atteindre les niveaux sans être pénalisé
 * par les critères à clé API. Le plafond conditionnel s'évalue sur le score
 * du Pilier 1 ramené sur 20 (mêmes proportions si un critère y est non testé).
 */

import type {
  CritereNonTeste,
  Niveau,
  PilierId,
  PilierResult,
} from './types.js';
import { round1 } from './types.js';

export const PLAFOND_MESSAGE =
  'Site non accessible aux crawlers IA, le reste du score est indicatif.';

/** Seuil du plafond conditionnel : Pilier 1 < 10/20 ⇒ score final ≤ 40/100. */
export function applyPlafond(
  scoreGlobal: number,
  scorePilier1: number,
): { score: number; plafond_applique: boolean } {
  const plafond_applique = scorePilier1 < 10;
  return {
    score: plafond_applique ? Math.min(scoreGlobal, 40) : scoreGlobal,
    plafond_applique,
  };
}

export function niveau(score: number): Niveau {
  if (score >= 70) return 'vert';
  if (score >= 40) return 'jaune';
  if (score >= 20) return 'orange';
  return 'rouge';
}

export interface ScoreGlobal {
  score_global: number;
  score_brut: number;
  score_max_teste: number;
  plafond_applique: boolean;
  niveau: Niveau;
  criteres_non_testes: CritereNonTeste[];
}

const RAISON_PREFIX = /^Non testé\s*:\s*/i;

export function computeScore(
  piliers: Record<PilierId, PilierResult>,
): ScoreGlobal {
  let brut = 0;
  let maxTeste = 0;
  let p1Brut = 0;
  let p1MaxTeste = 0;
  const nonTestes: CritereNonTeste[] = [];

  for (const [id, pilier] of Object.entries(piliers) as Array<
    [PilierId, PilierResult]
  >) {
    // Le Pilier 5 est rapporté à part (citation_mesuree), hors préparation.
    if (id === 'visibilite_mesuree') continue;
    for (const d of pilier.details) {
      if (d.statut === 'non_teste') {
        nonTestes.push({
          pilier: id,
          critere: d.critere,
          raison: d.preuve.replace(RAISON_PREFIX, ''),
        });
        continue;
      }
      brut += d.points_obtenus;
      maxTeste += d.points_max;
      if (id === 'accessibilite_ia') {
        p1Brut += d.points_obtenus;
        p1MaxTeste += d.points_max;
      }
    }
  }

  const normalise = maxTeste > 0 ? round1((brut / maxTeste) * 100) : 0;
  // Pilier 1 ramené sur 20 pour l'évaluation du plafond (ex. 1.3 non testé
  // sans Playwright : seuil < 10/20 appliqué à la même proportion sur 13).
  const p1Sur20 = p1MaxTeste > 0 ? (p1Brut / p1MaxTeste) * 20 : 20;
  const { score, plafond_applique } = applyPlafond(normalise, p1Sur20);

  return {
    score_global: round1(score),
    score_brut: round1(brut),
    score_max_teste: round1(maxTeste),
    plafond_applique,
    niveau: niveau(score),
    criteres_non_testes: nonTestes,
  };
}
