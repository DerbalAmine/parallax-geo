/**
 * Sous-critère 2.3 — Meta et Open Graph (3 points).
 *
 * title de 50 à 60 caractères : 1 pt. meta description de 120 à 160
 * caractères : 1 pt. og:title + og:description + og:image tous présents : 1 pt.
 */

import * as cheerio from 'cheerio';

export interface MetaEvaluation {
  titleLength: number;
  descriptionLength: number;
  ogPresent: { title: boolean; description: boolean; image: boolean };
  pointsTitle: number;
  pointsDescription: number;
  pointsOg: number;
  points: number;
}

export function evaluateMeta(html: string): MetaEvaluation {
  const $ = cheerio.load(html);

  const title = $('head title').first().text().trim();
  const description =
    $('meta[name="description"]').first().attr('content')?.trim() ?? '';

  const og = (property: string): boolean =>
    Boolean($(`meta[property="${property}"]`).first().attr('content')?.trim());

  const ogPresent = {
    title: og('og:title'),
    description: og('og:description'),
    image: og('og:image'),
  };

  const pointsTitle = title.length >= 50 && title.length <= 60 ? 1 : 0;
  const pointsDescription =
    description.length >= 120 && description.length <= 160 ? 1 : 0;
  const pointsOg =
    ogPresent.title && ogPresent.description && ogPresent.image ? 1 : 0;

  return {
    titleLength: title.length,
    descriptionLength: description.length,
    ogPresent,
    pointsTitle,
    pointsDescription,
    pointsOg,
    points: pointsTitle + pointsDescription + pointsOg,
  };
}
