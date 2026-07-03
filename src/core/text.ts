/**
 * Extraction du « texte utile » d'une page HTML — base commune du
 * sous-critère 1.3 (ratio sans JS) et des heuristiques textuelles.
 */

import * as cheerio from 'cheerio';

export function extractText(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, template, svg, iframe').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}
