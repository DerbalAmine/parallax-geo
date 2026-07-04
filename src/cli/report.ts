/**
 * Affichage terminal du rapport : piliers, score global /100 avec niveau et
 * plafond conditionnel, critères non testés à part, recommandations.
 */

import chalk from 'chalk';

import { PLAFOND_MESSAGE } from '../core/scoring.js';
import type { Niveau, PilierResult, Rapport, Recommandation } from '../core/types.js';

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

const COULEUR_NIVEAU: Record<Niveau, (s: string) => string> = {
  vert: chalk.green,
  jaune: chalk.yellow,
  orange: chalk.hex('#ff8800'),
  rouge: chalk.red,
};

const COULEUR_PRIORITE: Record<Recommandation['priorite'], (s: string) => string> = {
  haute: chalk.red,
  moyenne: chalk.yellow,
  basse: chalk.dim,
};

export function printScoreFinal(rapport: Rapport): void {
  const c = COULEUR_NIVEAU[rapport.niveau];
  console.log(
    chalk.bold(`\nScore de préparation GEO : ${c(`${rapport.score_global}/100`)} — niveau ${c(rapport.niveau.toUpperCase())}`),
  );
  if (rapport.plafond_applique) {
    console.log(chalk.red(`⚠ ${PLAFOND_MESSAGE}`));
  }
  console.log(
    chalk.dim(
      `Piliers 1 à 4 : ${rapport.score_brut} points sur ${rapport.score_max_teste} testés — critères non testés exclus du calcul.`,
    ),
  );

  const cm = rapport.citation_mesuree;
  if (cm.statut === 'mesuree') {
    const couleur = cm.citations > 0 ? chalk.green : chalk.red;
    console.log(
      chalk.bold('Citation mesurée aujourd\'hui : ') +
        couleur(`${cm.citations}/${cm.reponses} réponses LLM citent la marque`) +
        (cm.position_moyenne !== null ? ` (position moyenne ${cm.position_moyenne})` : '') +
        chalk.dim(' — signal complémentaire, hors score de préparation'),
    );
  } else {
    console.log(
      chalk.bold('Citation mesurée aujourd\'hui : ') +
        chalk.dim(`non mesurée — ${cm.raison}`),
    );
  }

  if (rapport.criteres_non_testes.length) {
    console.log(chalk.bold('\nCritères non testés :'));
    for (const nt of rapport.criteres_non_testes) {
      console.log(chalk.dim(`  · ${nt.critere} — ${nt.raison}`));
    }
  }

  if (rapport.recommandations.length) {
    console.log(chalk.bold('\nRecommandations (par points manquants) :'));
    for (const r of rapport.recommandations) {
      const badge = COULEUR_PRIORITE[r.priorite](`[${r.priorite}]`.padEnd(9));
      console.log(`  ${badge} ${r.action}`);
    }
  }
  console.log('');
}
