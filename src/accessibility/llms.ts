/**
 * Sous-critère 1.2 — Présence d'un fichier llms.txt (5 points).
 *
 * Méthode : fetch de /llms.txt puis /llms-full.txt. Réponse 200 avec contenu
 * non vide ⇒ 5 points, sinon 0.
 */

import type { Fetcher } from '../core/fetch.js';

export interface LlmsTxtResult {
  found: boolean;
  /** Chemin trouvé ('/llms.txt' ou '/llms-full.txt'), null sinon. */
  path: string | null;
  length: number;
  points: number;
}

export async function checkLlmsTxt(
  origin: string,
  fetcher: Fetcher,
): Promise<LlmsTxtResult> {
  for (const path of ['/llms.txt', '/llms-full.txt']) {
    const res = await fetcher(new URL(path, origin).href);
    const content = res.body.trim();
    if (res.ok && res.status === 200 && content.length > 0) {
      return { found: true, path, length: content.length, points: 5 };
    }
  }
  return { found: false, path: null, length: 0, points: 0 };
}
