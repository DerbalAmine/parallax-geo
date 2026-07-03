/**
 * Sous-critère 2.2 — Données structurées Schema.org (8 points).
 *
 * Extraction des blocs <script type="application/ld+json">, parsing JSON,
 * vérification des types : Organization ou LocalBusiness (3 pts),
 * FAQPage (3 pts), Article ou BlogPosting (2 pts).
 *
 * Les types sont collectés récursivement (y compris @graph et entités
 * imbriquées) ; un bloc au JSON invalide est ignoré sans faire échouer
 * l'analyse. Correspondance stricte avec les types listés par la grille.
 */

import * as cheerio from 'cheerio';

export function collectJsonLdTypes(html: string): Set<string> {
  const $ = cheerio.load(html);
  const types = new Set<string>();

  const collect = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) collect(item);
      return;
    }
    if (typeof node !== 'object' || node === null) return;
    const obj = node as Record<string, unknown>;
    const t = obj['@type'];
    if (typeof t === 'string') types.add(t);
    else if (Array.isArray(t)) {
      for (const item of t) if (typeof item === 'string') types.add(item);
    }
    for (const value of Object.values(obj)) collect(value);
  };

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text();
    try {
      collect(JSON.parse(raw));
    } catch {
      // Bloc JSON-LD invalide : ignoré.
    }
  });
  return types;
}

export interface SchemaEvaluation {
  types: string[];
  pointsOrganization: number;
  pointsFaq: number;
  pointsArticle: number;
  points: number;
}

export function evaluateSchema(html: string): SchemaEvaluation {
  const types = collectJsonLdTypes(html);
  const pointsOrganization =
    types.has('Organization') || types.has('LocalBusiness') ? 3 : 0;
  const pointsFaq = types.has('FAQPage') ? 3 : 0;
  const pointsArticle =
    types.has('Article') || types.has('BlogPosting') ? 2 : 0;
  return {
    types: [...types].sort(),
    pointsOrganization,
    pointsFaq,
    pointsArticle,
    points: pointsOrganization + pointsFaq + pointsArticle,
  };
}
