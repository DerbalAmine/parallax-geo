/**
 * Formule globale — voir docs/scoring-methodology.md, section « Formule globale ».
 */

import type { Niveau } from './types.js';

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
