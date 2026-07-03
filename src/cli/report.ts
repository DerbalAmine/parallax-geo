/**
 * Affichage terminal du rapport — version Phase 2 (piliers 1 et 2).
 * Le formatage final (score global, plafond, recommandations, exports)
 * sera consolidé en Phase 6.
 */

import chalk from 'chalk';

import type { PilierResult } from '../core/types.js';

function couleurScore(score: number, max: number): (s: string) => string {
  const ratio = max === 0 ? 0 : score / max;
  if (ratio >= 0.7) return chalk.green;
  if (ratio >= 0.4) return chalk.yellow;
  return chalk.red;
}

export function printPilier(titre: string, result: PilierResult): void {
  const c = couleurScore(result.score, result.max);
  console.log(chalk.bold(`\n${titre} — ${c(`${result.score}/${result.max}`)}`));
  for (const d of result.details) {
    const dc = couleurScore(d.points_obtenus, d.points_max);
    const badge =
      d.statut === 'non_teste'
        ? chalk.dim(' [non testé]')
        : '';
    console.log(
      `  ${dc(`${d.points_obtenus}/${d.points_max}`.padStart(7))}  ${d.critere}${badge}`,
    );
    console.log(chalk.dim(`           ${d.preuve}`));
  }
}

export function printPilierAVenir(titre: string, phase: string): void {
  console.log(
    chalk.bold(`\n${titre}`) + chalk.dim(` — à venir (${phase})`),
  );
}
