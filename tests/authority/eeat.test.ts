import { describe, expect, it } from 'vitest';

import {
  detectSiret,
  evaluateEeat,
  findAboutLink,
  findLegalLink,
  findNamedAuthor,
} from '../../src/authority/eeat.js';
import type { Fetcher } from '../../src/core/fetch.js';

const page = (body: string, head = '') =>
  `<html><head>${head}</head><body>${body}</body></html>`;

const noFetch: Fetcher = async () => ({ ok: false, status: 404, body: '' });

describe('findAboutLink', () => {
  it('détecte « à propos » dans le href ou le texte du lien', () => {
    expect(findAboutLink(page('<a href="/a-propos">Découvrir</a>')).found).toBe(true);
    expect(findAboutLink(page('<a href="/societe">À propos</a>')).found).toBe(true);
  });

  it('détecte « about » et « qui sommes-nous »', () => {
    expect(findAboutLink(page('<a href="/about-us">Team</a>')).found).toBe(true);
    expect(findAboutLink(page('<a href="/equipe">Qui sommes-nous ?</a>')).found).toBe(true);
  });

  it('aucun lien pertinent : non trouvé', () => {
    expect(findAboutLink(page('<a href="/tarifs">Tarifs</a>')).found).toBe(false);
  });
});

describe('findNamedAuthor', () => {
  it('détecte la balise meta author', () => {
    const res = findNamedAuthor(page('', '<meta name="author" content="Jeanne Martin">'));
    expect(res.found).toBe(true);
    expect(res.preuve).toContain('Jeanne Martin');
  });

  it('détecte un author Schema.org (objet Person)', () => {
    const res = findNamedAuthor(
      page(
        '',
        '<script type="application/ld+json">{"@type":"Article","author":{"@type":"Person","name":"Paul Durand"}}</script>',
      ),
    );
    expect(res.found).toBe(true);
    expect(res.preuve).toContain('Paul Durand');
  });

  it('accepte un author en simple chaîne', () => {
    const res = findNamedAuthor(
      page('', '<script type="application/ld+json">{"author":"Marie Curie"}</script>'),
    );
    expect(res.found).toBe(true);
  });

  it('aucun auteur : non trouvé', () => {
    expect(findNamedAuthor(page('<p>texte</p>')).found).toBe(false);
  });
});

describe('detectSiret', () => {
  it('détecte SIRET avec mot-clé et 14 chiffres espacés', () => {
    expect(detectSiret('SIRET : 123 456 789 00012')).toContain('123 456 789 00012');
  });

  it('détecte un SIREN à 9 chiffres avec mot-clé', () => {
    expect(detectSiret('SIREN 123456789')).not.toBeNull();
  });

  it('détecte le motif 14 chiffres 3-3-3-5 sans mot-clé', () => {
    expect(detectSiret('Immatriculée sous le numéro 123 456 789 00012 au RCS')).not.toBeNull();
  });

  it('ignore un simple numéro de téléphone', () => {
    expect(detectSiret('Appelez le 01 23 45 67 89 pour un devis')).toBeNull();
  });
});

describe('findLegalLink', () => {
  it('trouve le lien mentions légales du même domaine', () => {
    const html = page('<a href="/mentions-legales">Mentions légales</a>');
    expect(findLegalLink(html, 'https://exemple.fr/')).toBe(
      'https://exemple.fr/mentions-legales',
    );
  });

  it('retourne null sans lien pertinent', () => {
    expect(findLegalLink(page('<a href="/blog">Blog</a>'), 'https://exemple.fr/')).toBeNull();
  });
});

describe('evaluateEeat (sous-critère 4.2)', () => {
  it('les trois signaux présents : 6 points', async () => {
    const html = page(
      '<a href="/a-propos">À propos</a><p>SIRET : 123 456 789 00012</p>',
      '<meta name="author" content="Jeanne Martin">',
    );
    const res = await evaluateEeat(html, 'https://exemple.fr/', noFetch);
    expect(res.points).toBe(6);
  });

  it('va chercher le SIRET sur la page mentions légales', async () => {
    const html = page('<a href="/mentions-legales">Mentions légales</a>');
    const fetcher: Fetcher = async (url) =>
      url === 'https://exemple.fr/mentions-legales'
        ? { ok: true, status: 200, body: '<body><p>SIRET 123 456 789 00012</p></body>' }
        : { ok: false, status: 404, body: '' };
    const res = await evaluateEeat(html, 'https://exemple.fr/', fetcher);
    expect(res.siret.found).toBe(true);
    expect(res.siret.source).toBe('https://exemple.fr/mentions-legales');
    expect(res.points).toBe(2);
  });

  it('aucun signal : 0 point', async () => {
    const res = await evaluateEeat(page('<p>bonjour</p>'), 'https://exemple.fr/', noFetch);
    expect(res.points).toBe(0);
  });
});
