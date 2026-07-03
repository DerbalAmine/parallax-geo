/**
 * Sous-critère 2.4 — Format question-réponse détectable (4 points).
 *
 * Détection : phrases finissant par « ? » suivies dans les 200 caractères
 * d'un paragraphe de réponse ; balises <details>/<summary> ; classes CSS
 * contenant faq, question ou accordion.
 * Score = nombre de patterns détectés, plafonné à 4 points (1 pt/pattern).
 */

import * as cheerio from 'cheerio';

import { extractText } from '../core/text.js';

/** Longueur minimale (caractères) pour considérer qu'une réponse suit la question. */
const MIN_ANSWER_LENGTH = 80;

export function countTextQuestions(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '?') continue;
    const following = text.slice(i + 1, i + 201).trim();
    // On coupe à la prochaine question pour ne pas compter une simple
    // liste de questions sans réponses.
    const answer = following.split('?')[0] ?? '';
    if (answer.length >= MIN_ANSWER_LENGTH) count++;
  }
  return count;
}

export interface QaEvaluation {
  textQuestions: number;
  detailsSummary: number;
  faqClassElements: number;
  totalPatterns: number;
  points: number;
}

export function evaluateQa(html: string): QaEvaluation {
  const $ = cheerio.load(html);

  const textQuestions = countTextQuestions(extractText(html));
  const detailsSummary = $('details summary').length;
  const faqClassElements = $('[class]')
    .toArray()
    .filter((el) => /faq|question|accordion/i.test($(el).attr('class') ?? ''))
    .length;

  const totalPatterns = textQuestions + detailsSummary + faqClassElements;
  return {
    textQuestions,
    detailsSummary,
    faqClassElements,
    totalPatterns,
    points: Math.min(totalPatterns, 4),
  };
}
