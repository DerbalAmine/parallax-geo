/**
 * Sous-critère 3.4 — Fraîcheur du contenu (5 points).
 *
 * Méthode (docs/scoring-methodology.md) : date via meta article:modified_time,
 * balise time, ou pattern texte « mis à jour le ». Moins de 6 mois : 5 pts ;
 * entre 6 et 12 mois : 3 pts ; plus de 12 mois ou date absente : 0.
 *
 * Choix d'implémentation : si plusieurs dates sont trouvées, la plus récente
 * est retenue ; « entre 6 et 12 mois » est lu comme [6, 12] mois inclus ;
 * une date future est traitée comme aujourd'hui.
 */

import * as cheerio from 'cheerio';

import { extractText } from '../core/text.js';

const MOIS_FR: Record<string, number> = {
  janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10,
  décembre: 11, decembre: 11,
};

export function parseFrenchDate(text: string): Date | null {
  const m =
    /(\d{1,2})(?:er)?\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})/i.exec(
      text,
    );
  if (m) {
    const month = MOIS_FR[m[2]!.toLowerCase()];
    if (month !== undefined) {
      return new Date(Date.UTC(Number(m[3]), month, Number(m[1])));
    }
  }
  const numeric = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(text);
  if (numeric) {
    return new Date(
      Date.UTC(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1])),
    );
  }
  return null;
}

function parseIso(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface FreshnessEvaluation {
  date: Date | null;
  /** Où la date a été trouvée. */
  source: string | null;
  ageMois: number | null;
  points: number;
}

/** Toutes les dates candidates de la page, la plus récente gagne. */
export function findContentDates(html: string): Array<{ date: Date; source: string }> {
  const $ = cheerio.load(html);
  const found: Array<{ date: Date; source: string }> = [];

  for (const property of ['article:modified_time', 'article:published_time', 'og:updated_time']) {
    const d = parseIso($(`meta[property="${property}"]`).first().attr('content'));
    if (d) found.push({ date: d, source: `meta ${property}` });
  }

  $('time[datetime]').each((_, el) => {
    const d = parseIso($(el).attr('datetime'));
    if (d) found.push({ date: d, source: 'balise <time>' });
  });

  const text = extractText(html);
  const updated =
    /(?:mis(?:e)?s? à jour(?: le)?|dernière (?:mise à jour|modification)(?: le)?)\s*:?\s*(.{0,40})/i.exec(
      text,
    );
  if (updated) {
    const d = parseFrenchDate(updated[1] ?? '');
    if (d) found.push({ date: d, source: 'texte « mis à jour le »' });
  }

  return found;
}

export function evaluateFreshness(html: string, now: Date = new Date()): FreshnessEvaluation {
  const dates = findContentDates(html);
  if (!dates.length) return { date: null, source: null, ageMois: null, points: 0 };

  const latest = dates.reduce((a, b) => (b.date > a.date ? b : a));
  const ageMs = Math.max(0, now.getTime() - latest.date.getTime());
  const ageMois = ageMs / (30.44 * 24 * 3600 * 1000);

  let points = 0;
  if (ageMois < 6) points = 5;
  else if (ageMois <= 12) points = 3;

  return {
    date: latest.date,
    source: latest.source,
    ageMois: Math.round(ageMois * 10) / 10,
    points,
  };
}
