/**
 * Pilier 2 — Structure sémantique (20 points).
 * Analyse du HTML brut (fetch statique), entièrement heuristique (palier 0).
 */

import type { CritereDetail, PilierResult } from '../core/types.js';
import { round1 } from '../core/types.js';
import { evaluateHeadings } from './headings.js';
import { evaluateMeta } from './meta.js';
import { evaluateQa } from './qa.js';
import { evaluateSchema } from './schema.js';

export function auditSemantic(html: string): PilierResult {
  const details: CritereDetail[] = [];

  const headings = evaluateHeadings(html);
  details.push({
    critere: '2.1 Hiérarchie Hn propre',
    points_obtenus: headings.points,
    points_max: 5,
    methode:
      'Parsing DOM : H1 unique (2 pts), aucun saut de niveau (2 pts), titres > 3 mots significatifs (1 pt)',
    preuve: `${headings.h1Count} H1 ; saut de niveau : ${headings.hasLevelSkip ? 'oui' : 'non'} ; ${Math.round(headings.wordyHeadingRatio * 100)} % des titres > 3 mots significatifs`,
  });

  const schema = evaluateSchema(html);
  details.push({
    critere: '2.2 Données structurées Schema.org',
    points_obtenus: schema.points,
    points_max: 8,
    methode:
      'Blocs ld+json : Organization/LocalBusiness (3 pts), FAQPage (3 pts), Article/BlogPosting (2 pts)',
    preuve: schema.types.length
      ? `Types détectés : ${schema.types.join(', ')}`
      : 'Aucun bloc JSON-LD exploitable',
  });

  const meta = evaluateMeta(html);
  details.push({
    critere: '2.3 Meta et Open Graph',
    points_obtenus: meta.points,
    points_max: 3,
    methode:
      'title 50-60 caractères (1 pt), meta description 120-160 (1 pt), og:title + og:description + og:image (1 pt)',
    preuve: `title ${meta.titleLength} car. ; description ${meta.descriptionLength} car. ; OG complets : ${meta.pointsOg ? 'oui' : 'non'}`,
  });

  const qa = evaluateQa(html);
  details.push({
    critere: '2.4 Format question-réponse détectable',
    points_obtenus: qa.points,
    points_max: 4,
    methode:
      'Questions suivies d\'une réponse (regex), balises details/summary, classes CSS faq/question/accordion — 1 pt par pattern, plafonné à 4',
    preuve: `${qa.textQuestions} question(s)-réponse(s) texte, ${qa.detailsSummary} details/summary, ${qa.faqClassElements} élément(s) à classe FAQ`,
  });

  const score = round1(details.reduce((sum, d) => sum + d.points_obtenus, 0));
  return { score, max: 20, details };
}
