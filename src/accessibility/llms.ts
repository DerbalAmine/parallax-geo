/**
 * Sous-critère 1.2 — Présence d'un fichier llms.txt (5 points).
 *
 * Méthode : fetch de /llms.txt puis /llms-full.txt. Réponse 200 avec contenu
 * non vide ⇒ 5 points, sinon 0. Garde anti soft-404 : un serveur qui renvoie
 * sa page HTML avec un code 200 pour n'importe quel chemin ne compte pas —
 * content-type text/html rejeté, et contenu qui commence par du HTML rejeté
 * même sans content-type (fetcher de test, serveur mal configuré).
 */

import type { Fetcher } from '../core/fetch.js';

export interface LlmsTxtResult {
  found: boolean;
  /** Chemin trouvé ('/llms.txt' ou '/llms-full.txt'), null sinon. */
  path: string | null;
  length: number;
  points: number;
}

function looksLikeHtml(content: string, contentType?: string): boolean {
  if (contentType?.toLowerCase().includes('text/html')) return true;
  return /^<!doctype\b|^<html\b/i.test(content);
}

export async function checkLlmsTxt(
  origin: string,
  fetcher: Fetcher,
): Promise<LlmsTxtResult> {
  for (const path of ['/llms.txt', '/llms-full.txt']) {
    const res = await fetcher(new URL(path, origin).href);
    const content = res.body.trim();
    if (
      res.ok &&
      res.status === 200 &&
      content.length > 0 &&
      !looksLikeHtml(content, res.contentType)
    ) {
      return { found: true, path, length: content.length, points: 5 };
    }
  }
  return { found: false, path: null, length: 0, points: 0 };
}
