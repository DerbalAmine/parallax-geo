/**
 * Sous-critère 3.3 — Définitions autonomes (6 points).
 *
 * Méthode (docs/scoring-methodology.md) : patterns « X est un », « X désigne »,
 * « X se définit comme » en début de paragraphe, phrase complète de plus de
 * 15 mots. Score proportionnel au nombre trouvé, plafonné à 6 points
 * (1 point par définition).
 */

import * as cheerio from 'cheerio';

/**
 * Sujet court (< 80 caractères, sans ponctuation de fin de phrase) suivi
 * d'un verbe définitoire, en tout début de paragraphe.
 */
const DEFINITION_RE =
  /^[^.!?]{1,80}?\b(?:est une?|est l[ae]|sont des|désigne|se définit comme|se définissent comme)\s/iu;

export function firstSentence(text: string): string {
  const match = /^[\s\S]*?[.!?](?=\s|$)/.exec(text);
  return (match ? match[0] : text).trim();
}

export function isDefinition(paragraph: string): boolean {
  const text = paragraph.replace(/\s+/g, ' ').trim();
  if (!DEFINITION_RE.test(text)) return false;
  const sentence = firstSentence(text);
  const words = sentence.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
  return words.length > 15;
}

export interface DefinitionsEvaluation {
  definitions: number;
  /** Premières définitions détectées (preuve, tronquées). */
  exemples: string[];
  points: number;
}

export function evaluateDefinitions(html: string): DefinitionsEvaluation {
  const $ = cheerio.load(html);
  const exemples: string[] = [];
  let definitions = 0;

  $('p, li, dd').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!isDefinition(text)) return;
    definitions++;
    if (exemples.length < 2) {
      exemples.push(firstSentence(text).slice(0, 90) + '…');
    }
  });

  return { definitions, exemples, points: Math.min(definitions, 6) };
}
