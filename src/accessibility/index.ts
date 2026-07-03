/**
 * Pilier 1 — Accessibilité IA (20 points).
 * Entièrement heuristique, aucune clé API (palier 0).
 */

import type { Fetcher } from '../core/fetch.js';
import type { Renderer } from '../core/render.js';
import { extractText } from '../core/text.js';
import type { CritereDetail, PilierResult } from '../core/types.js';
import { round1 } from '../core/types.js';
import { checkLlmsTxt } from './llms.js';
import { scoreNoJs } from './nojs.js';
import { evaluateRobots } from './robots.js';

export interface AccessibilityInput {
  /** URL de la page auditée (absolue). */
  url: string;
  /** HTML brut déjà récupéré par le CLI. */
  staticHtml: string;
  fetcher: Fetcher;
  renderer: Renderer;
}

export async function auditAccessibility(
  input: AccessibilityInput,
): Promise<PilierResult> {
  const details: CritereDetail[] = [];
  const origin = new URL(input.url).origin;

  // 1.1 robots.txt
  const robotsRes = await input.fetcher(new URL('/robots.txt', origin).href);
  const robotsContent =
    robotsRes.ok && robotsRes.status === 200 ? robotsRes.body : null;
  const robots = evaluateRobots(robotsContent);
  const blockedNames = robots.verdicts
    .filter((v) => v.blocked)
    .map((v) => v.bot);
  details.push({
    critere: '1.1 Robots.txt n\'exclut pas les crawlers IA',
    points_obtenus: round1(robots.points),
    points_max: 8,
    methode:
      'Parsing des blocs User-agent de /robots.txt pour GPTBot, ClaudeBot (anthropic-ai), PerplexityBot, Google-Extended, CCBot',
    preuve:
      robotsContent === null
        ? 'robots.txt absent ou injoignable : aucun crawler IA bloqué (5/5 autorisés)'
        : blockedNames.length === 0
          ? `Aucun crawler IA bloqué (${robots.allowed}/${robots.tested} autorisés)`
          : `Bloqués : ${blockedNames.join(', ')} (${robots.allowed}/${robots.tested} autorisés)`,
  });

  // 1.2 llms.txt
  const llms = await checkLlmsTxt(origin, input.fetcher);
  details.push({
    critere: '1.2 Présence d\'un fichier llms.txt',
    points_obtenus: llms.points,
    points_max: 5,
    methode: 'Fetch de /llms.txt puis /llms-full.txt (200 + contenu non vide)',
    preuve: llms.found
      ? `${llms.path} présent (${llms.length} caractères)`
      : 'Ni /llms.txt ni /llms-full.txt trouvés',
  });

  // 1.3 contenu sans JavaScript
  const staticText = extractText(input.staticHtml);
  try {
    const renderedHtml = await input.renderer(input.url);
    const renderedText = extractText(renderedHtml);
    const nojs = scoreNoJs(staticText.length, renderedText.length);
    details.push({
      critere: '1.3 Contenu accessible sans JavaScript',
      points_obtenus: nojs.points,
      points_max: 7,
      methode:
        'Ratio longueur texte utile HTML brut (cheerio) / texte après rendu complet (Playwright)',
      preuve: `Ratio ${nojs.ratio.toFixed(2)} (${staticText.length} caractères bruts / ${renderedText.length} rendus)`,
    });
  } catch (err) {
    details.push({
      critere: '1.3 Contenu accessible sans JavaScript',
      points_obtenus: 0,
      points_max: 7,
      methode:
        'Ratio longueur texte utile HTML brut (cheerio) / texte après rendu complet (Playwright)',
      preuve: `Non testé : ${err instanceof Error ? err.message : String(err)}`,
      statut: 'non_teste',
    });
  }

  const score = round1(
    details.reduce((sum, d) => sum + d.points_obtenus, 0),
  );
  return { score, max: 20, details };
}
