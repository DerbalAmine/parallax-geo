/**
 * Sous-critère 3.1 — Réponses directes en début de section (7 points).
 *
 * Méthode (docs/scoring-methodology.md) : pour chaque section délimitée par
 * un Hn, classification binaire par l'API Claude : les deux premières phrases
 * répondent-elles directement à la question posée par le titre ?
 * Score = 7 × (sections avec réponse directe / total des sections).
 *
 * Choix d'implémentation (CHANGELOG) :
 * - un seul appel API groupé pour toutes les sections (au lieu d'un appel
 *   par section) — même classification, coût et latence réduits ;
 * - modèle claude-haiku-4-5 (la grille demande un « appel API Claude
 *   léger ») ;
 * - sections plafonnées à 20 par page pour maîtriser les coûts ;
 * - le classificateur est injectable : les tests n'appellent pas l'API.
 */

import { round1 } from '../core/types.js';
import type { Section } from './sections.js';

/** Retourne, pour chaque section, si l'ouverture répond directement au titre. */
export type SectionClassifier = (sections: Section[]) => Promise<boolean[]>;

export const MAX_SECTIONS = 20;
export const CLAUDE_MODEL = 'claude-haiku-4-5';

const PROMPT_INSTRUCTIONS = `Tu évalues des sections de page web pour un audit GEO (Generative Engine Optimization).
Pour chaque section ci-dessous, réponds à une question binaire : les phrases d'ouverture répondent-elles DIRECTEMENT à la question ou au sujet annoncé par le titre (réponse immédiate, factuelle, autonome), plutôt que de faire une introduction vague, une accroche marketing ou une digression ?

Réponds UNIQUEMENT avec un tableau JSON de booléens, un par section, dans l'ordre. Exemple : [true,false,true]
Aucun autre texte.`;

export function buildPrompt(sections: Section[]): string {
  const blocs = sections
    .map(
      (s, i) =>
        `Section ${i + 1}\nTitre : ${s.titre}\nOuverture : ${s.ouverture}`,
    )
    .join('\n\n');
  return `${PROMPT_INSTRUCTIONS}\n\n${blocs}`;
}

/** Extrait le tableau JSON de booléens d'une réponse de modèle. */
export function parseClassifierResponse(raw: string, expected: number): boolean[] {
  const match = /\[[^\]]*\]/.exec(raw);
  if (!match) throw new Error('Réponse du classificateur sans tableau JSON');
  const parsed: unknown = JSON.parse(match[0]);
  if (
    !Array.isArray(parsed) ||
    parsed.length !== expected ||
    !parsed.every((v) => typeof v === 'boolean')
  ) {
    throw new Error(
      `Réponse du classificateur invalide (${expected} booléens attendus)`,
    );
  }
  return parsed;
}

/** Classificateur réel : un appel groupé à l'API Claude. */
export function buildClaudeClassifier(apiKey: string): SectionClassifier {
  return async (sections) => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: buildPrompt(sections) }],
    });
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');
    return parseClassifierResponse(text, sections.length);
  };
}

export interface DirectAnswersEvaluation {
  totalSections: number;
  classifiedSections: number;
  directAnswers: number;
  points: number;
}

export async function evaluateDirectAnswers(
  sections: Section[],
  classifier: SectionClassifier,
): Promise<DirectAnswersEvaluation> {
  const sample = sections.slice(0, MAX_SECTIONS);
  if (!sample.length) {
    return { totalSections: 0, classifiedSections: 0, directAnswers: 0, points: 0 };
  }
  const verdicts = await classifier(sample);
  const directAnswers = verdicts.filter(Boolean).length;
  return {
    totalSections: sections.length,
    classifiedSections: sample.length,
    directAnswers,
    points: round1((7 * directAnswers) / sample.length),
  };
}
