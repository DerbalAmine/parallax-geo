import { describe, expect, it } from 'vitest';

import { evaluateMeta } from '../../src/semantic/meta.js';

const page = (head: string) => `<html><head>${head}</head><body></body></html>`;

describe('evaluateMeta (sous-critère 2.3)', () => {
  it('title de 50 à 60 caractères : 1 point', () => {
    const title = 'x'.repeat(55);
    expect(evaluateMeta(page(`<title>${title}</title>`)).pointsTitle).toBe(1);
  });

  it('title trop court ou trop long : 0 point', () => {
    expect(evaluateMeta(page('<title>Court</title>')).pointsTitle).toBe(0);
    expect(
      evaluateMeta(page(`<title>${'x'.repeat(80)}</title>`)).pointsTitle,
    ).toBe(0);
  });

  it('les bornes 50 et 60 sont incluses', () => {
    expect(evaluateMeta(page(`<title>${'x'.repeat(50)}</title>`)).pointsTitle).toBe(1);
    expect(evaluateMeta(page(`<title>${'x'.repeat(60)}</title>`)).pointsTitle).toBe(1);
  });

  it('meta description de 120 à 160 caractères : 1 point', () => {
    const desc = 'y'.repeat(140);
    expect(
      evaluateMeta(page(`<meta name="description" content="${desc}">`))
        .pointsDescription,
    ).toBe(1);
  });

  it('description absente ou hors bornes : 0 point', () => {
    expect(evaluateMeta(page('')).pointsDescription).toBe(0);
    expect(
      evaluateMeta(page(`<meta name="description" content="${'y'.repeat(90)}">`))
        .pointsDescription,
    ).toBe(0);
  });

  it('og:title + og:description + og:image tous présents : 1 point', () => {
    const res = evaluateMeta(
      page(
        '<meta property="og:title" content="T">' +
          '<meta property="og:description" content="D">' +
          '<meta property="og:image" content="https://exemple.fr/i.png">',
      ),
    );
    expect(res.pointsOg).toBe(1);
  });

  it('un seul OG manquant : 0 point', () => {
    const res = evaluateMeta(
      page(
        '<meta property="og:title" content="T">' +
          '<meta property="og:description" content="D">',
      ),
    );
    expect(res.pointsOg).toBe(0);
  });

  it('un OG présent mais vide ne compte pas', () => {
    const res = evaluateMeta(
      page(
        '<meta property="og:title" content="">' +
          '<meta property="og:description" content="D">' +
          '<meta property="og:image" content="i.png">',
      ),
    );
    expect(res.pointsOg).toBe(0);
  });
});
