/**
 * Pilier 3 — Citabilité du contenu (25 points).
 *
 * 3.2, 3.3, 3.4 : heuristiques pures (palier 0).
 * 3.1 : classification par l'API Claude (palier 1, flag --with-claude).
 * Sans classificateur disponible, 3.1 est marqué « non testé » — l'audit
 * aboutit toujours.
 */

import type { CritereDetail, PilierResult } from '../core/types.js';
import { round1 } from '../core/types.js';
import type { SectionClassifier } from './direct-answers.js';
import { evaluateDirectAnswers } from './direct-answers.js';
import { evaluateDefinitions } from './definitions.js';
import { evaluateFreshness } from './freshness.js';
import { extractSections } from './sections.js';
import { evaluateSourcedData } from './sourced-data.js';

export interface CitabilityInput {
  url: string;
  staticHtml: string;
  /**
   * Classificateur 3.1. Absent ⇒ critère non testé ; la raison est affichée
   * dans la preuve (flag --with-claude non passé, ou clé Claude absente).
   */
  classifier?: SectionClassifier;
  /** Raison de l'absence de classificateur, pour la preuve du rapport. */
  classifierAbsentReason?: string;
  /** Date de référence pour la fraîcheur (injectable pour les tests). */
  now?: Date;
}

const METHODE_31 =
  'Classification binaire par section (API Claude) : l\'ouverture répond-elle directement au titre — 7 × (réponses directes / sections)';

export async function auditCitability(input: CitabilityInput): Promise<PilierResult> {
  const details: CritereDetail[] = [];

  // 3.1 Réponses directes en début de section
  if (input.classifier) {
    try {
      const sections = extractSections(input.staticHtml);
      const res = await evaluateDirectAnswers(sections, input.classifier);
      details.push({
        critere: '3.1 Réponses directes en début de section',
        points_obtenus: res.points,
        points_max: 7,
        methode: METHODE_31,
        preuve: res.classifiedSections
          ? `${res.directAnswers}/${res.classifiedSections} sections avec réponse directe` +
            (res.totalSections > res.classifiedSections
              ? ` (${res.totalSections} sections, ${res.classifiedSections} premières classifiées)`
              : '')
          : 'Aucune section exploitable (pas de titre suivi de contenu)',
      });
    } catch (err) {
      details.push({
        critere: '3.1 Réponses directes en début de section',
        points_obtenus: 0,
        points_max: 7,
        methode: METHODE_31,
        preuve: `Non testé : erreur API Claude — ${err instanceof Error ? err.message : String(err)}`,
        statut: 'non_teste',
      });
    }
  } else {
    details.push({
      critere: '3.1 Réponses directes en début de section',
      points_obtenus: 0,
      points_max: 7,
      methode: METHODE_31,
      preuve: `Non testé : ${input.classifierAbsentReason ?? 'clé API absente'}`,
      statut: 'non_teste',
    });
  }

  // 3.2 Chiffres et données sourcées
  const sourced = evaluateSourcedData(input.staticHtml, input.url);
  details.push({
    critere: '3.2 Chiffres et données sourcées',
    points_obtenus: sourced.points,
    points_max: 7,
    methode:
      'Nombres/pourcentages/dates à moins de 100 caractères d\'un lien externe ou d\'une expression de source — densité pour 1000 mots, plafonnée à 7',
    preuve: `${sourced.sourcedDataPoints}/${sourced.dataPoints} data points sourcés sur ${sourced.wordCount} mots (densité ${sourced.density}/1000)`,
  });

  // 3.3 Définitions autonomes
  const defs = evaluateDefinitions(input.staticHtml);
  details.push({
    critere: '3.3 Définitions autonomes',
    points_obtenus: defs.points,
    points_max: 6,
    methode:
      '« X est un », « X désigne », « X se définit comme » en début de paragraphe, phrase > 15 mots — 1 pt par définition, plafonné à 6',
    preuve: defs.definitions
      ? `${defs.definitions} définition(s) — ex. : ${defs.exemples.join(' | ')}`
      : 'Aucune définition autonome détectée',
  });

  // 3.4 Fraîcheur du contenu
  const fresh = evaluateFreshness(input.staticHtml, input.now);
  details.push({
    critere: '3.4 Fraîcheur du contenu',
    points_obtenus: fresh.points,
    points_max: 5,
    methode:
      'Date via meta article:modified_time, balise <time> ou « mis à jour le » — < 6 mois : 5 pts ; 6-12 mois : 3 pts ; sinon 0',
    preuve: fresh.date
      ? `Date la plus récente : ${fresh.date.toISOString().slice(0, 10)} (${fresh.ageMois} mois, via ${fresh.source})`
      : 'Aucune date de publication ou de mise à jour détectée',
  });

  const score = round1(details.reduce((sum, d) => sum + d.points_obtenus, 0));
  return { score, max: 25, details };
}
