/**
 * Utilitaires JSON-LD partagés (sous-critères 2.2, 4.1, 4.2).
 * Un bloc au JSON invalide est ignoré sans faire échouer l'analyse.
 */

import * as cheerio from 'cheerio';

export function extractJsonLdObjects(html: string): unknown[] {
  const $ = cheerio.load(html);
  const objects: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      objects.push(JSON.parse($(el).text()));
    } catch {
      // Bloc JSON-LD invalide : ignoré.
    }
  });
  return objects;
}

/** Visite récursivement chaque objet (y compris @graph et entités imbriquées). */
export function walkJsonLd(
  objects: unknown[],
  visit: (obj: Record<string, unknown>) => void,
): void {
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (typeof node !== 'object' || node === null) return;
    visit(node as Record<string, unknown>);
    for (const value of Object.values(node)) walk(value);
  };
  for (const obj of objects) walk(obj);
}

/** Types déclarés par un nœud (@type simple ou en tableau). */
export function typesOf(obj: Record<string, unknown>): string[] {
  const t = obj['@type'];
  if (typeof t === 'string') return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === 'string');
  return [];
}
