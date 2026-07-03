/**
 * Découpage de la page en sections délimitées par les Hn (support du 3.1).
 * Pour chaque section : le titre et les deux premières phrases du contenu
 * qui suit, conformément à la méthode de la grille.
 */

import * as cheerio from 'cheerio';

export interface Section {
  titre: string;
  /** Les deux premières phrases du contenu de la section. */
  ouverture: string;
}

export function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
}

export function extractSections(html: string): Section[] {
  const $ = cheerio.load(html);
  const sections: Section[] = [];

  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const titre = $(el).text().replace(/\s+/g, ' ').trim();
    if (!titre) return;
    // Contenu jusqu'au prochain titre, au même niveau du DOM.
    const contenu = $(el)
      .nextUntil('h1, h2, h3, h4, h5, h6')
      .toArray()
      .map((n) => $(n).text())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!contenu) return;
    const ouverture = splitSentences(contenu).slice(0, 2).join(' ');
    if (ouverture) sections.push({ titre, ouverture });
  });

  return sections;
}
