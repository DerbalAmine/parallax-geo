/**
 * Sous-critère 2.1 — Hiérarchie Hn propre (5 points).
 *
 * Un seul H1 : 2 pts. Absence de saut de niveau (H1 → H3 sans H2) : 2 pts.
 * Titres contenant plus de 3 mots significatifs : 1 point, noté au prorata :
 * 1 point multiplié par (nombre de titres avec plus de 3 mots significatifs
 * divisé par nombre total de titres de la page).
 *
 * Choix d'implémentation (documentés au CHANGELOG) :
 * - « mot significatif » = mot de 3 lettres ou plus, hors mots vides fr/en ;
 * - une page sans aucun titre obtient 0 sur les trois volets.
 */

import * as cheerio from 'cheerio';

import { round1 } from '../core/types.js';

const MOTS_VIDES = new Set([
  // français
  'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'ou', 'en',
  'au', 'aux', 'pour', 'par', 'sur', 'dans', 'avec', 'sans', 'chez',
  'ce', 'cet', 'cette', 'ces', 'qui', 'que', 'quoi', 'dont', 'mais',
  'est', 'sont', 'etre', 'être', 'vos', 'nos', 'votre', 'notre', 'son',
  'ses', 'leur', 'leurs', 'plus', 'pas', 'nous', 'vous', 'ils', 'elles',
  // anglais
  'the', 'of', 'to', 'in', 'on', 'for', 'and', 'or', 'is', 'are', 'be',
  'with', 'your', 'our', 'how', 'what', 'why', 'when', 'from', 'you',
]);

export function significantWordCount(title: string): number {
  const words = title.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
  return words.filter((w) => w.length >= 3 && !MOTS_VIDES.has(w)).length;
}

export interface HeadingsEvaluation {
  h1Count: number;
  levels: number[];
  hasLevelSkip: boolean;
  wordyHeadingRatio: number;
  pointsH1: number;
  pointsNoSkip: number;
  pointsWordy: number;
  points: number;
}

export function evaluateHeadings(html: string): HeadingsEvaluation {
  const $ = cheerio.load(html);
  const headings = $('h1, h2, h3, h4, h5, h6')
    .toArray()
    .map((el) => ({
      level: Number(el.tagName.slice(1)),
      text: $(el).text().replace(/\s+/g, ' ').trim(),
    }));

  const levels = headings.map((h) => h.level);
  const h1Count = levels.filter((l) => l === 1).length;

  let hasLevelSkip = false;
  for (let i = 1; i < levels.length; i++) {
    const prev = levels[i - 1]!;
    const next = levels[i]!;
    if (next > prev + 1) {
      hasLevelSkip = true;
      break;
    }
  }

  const wordy = headings.filter((h) => significantWordCount(h.text) > 3);
  const wordyHeadingRatio = headings.length ? wordy.length / headings.length : 0;

  const empty = headings.length === 0;
  const pointsH1 = !empty && h1Count === 1 ? 2 : 0;
  const pointsNoSkip = !empty && !hasLevelSkip ? 2 : 0;
  const pointsWordy = round1(wordyHeadingRatio);

  return {
    h1Count,
    levels,
    hasLevelSkip,
    wordyHeadingRatio,
    pointsH1,
    pointsNoSkip,
    pointsWordy,
    points: round1(pointsH1 + pointsNoSkip + pointsWordy),
  };
}
