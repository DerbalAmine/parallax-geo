import { describe, expect, it } from 'vitest';

import {
  evaluateNap,
  extractFooterText,
  extractPhones,
  extractSchemaNap,
  findContactLink,
  normalizePhone,
  normalizeText,
} from '../../src/authority/nap.js';
import type { Fetcher } from '../../src/core/fetch.js';

const ORG = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Cabinet Dupont',
  telephone: '+33 1 23 45 67 89',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '10 rue de la Paix',
    postalCode: '75002',
    addressLocality: 'Paris',
  },
});

const page = (jsonld: string | null, body: string) =>
  `<html><head>${jsonld ? `<script type="application/ld+json">${jsonld}</script>` : ''}</head><body>${body}</body></html>`;

const noFetch: Fetcher = async () => ({ ok: false, status: 404, body: '' });

describe('normalizePhone', () => {
  it('ramène +33 et 0033 au format national', () => {
    expect(normalizePhone('+33 1 23 45 67 89')).toBe('0123456789');
    expect(normalizePhone('0033 1 23 45 67 89')).toBe('0123456789');
    expect(normalizePhone('01.23.45.67.89')).toBe('0123456789');
  });
});

describe('normalizeText', () => {
  it('ignore casse, accents et espaces multiples', () => {
    expect(normalizeText('  Société   Générale ')).toBe('societe generale');
  });
});

describe('extractPhones', () => {
  it('détecte les formats français courants', () => {
    const phones = extractPhones('Tél : 01 23 45 67 89 ou +33 6 98 76 54 32');
    expect(phones.has('0123456789')).toBe(true);
    expect(phones.has('0698765432')).toBe(true);
  });
});

describe('extractSchemaNap', () => {
  it('extrait nom, téléphone et adresse d\'un Organization', () => {
    const nap = extractSchemaNap(page(ORG, ''));
    expect(nap?.name).toBe('Cabinet Dupont');
    expect(nap?.telephone).toBe('+33 1 23 45 67 89');
    expect(nap?.address?.postalCode).toBe('75002');
  });

  it('retourne null sans bloc Organization/LocalBusiness', () => {
    expect(extractSchemaNap(page('{"@type":"WebSite"}', ''))).toBeNull();
    expect(extractSchemaNap(page(null, ''))).toBeNull();
  });

  it('trouve un Organization dans un @graph', () => {
    const nap = extractSchemaNap(
      page(`{"@graph":[{"@type":"WebSite"},${ORG}]}`, ''),
    );
    expect(nap?.name).toBe('Cabinet Dupont');
  });

  it('reconnaît les sous-types officiels de LocalBusiness (ProfessionalService)', () => {
    const nap = extractSchemaNap(
      page('{"@type":"ProfessionalService","name":"ComplyPME","telephone":"01 23 45 67 89"}', ''),
    );
    expect(nap?.name).toBe('ComplyPME');
  });
});

describe('extractFooterText / findContactLink', () => {
  it('lit la balise footer et les classes footer', () => {
    const text = extractFooterText(
      '<body><footer>Pied de page</footer><div class="site-footer">Autre</div></body>',
    );
    expect(text).toContain('Pied de page');
    expect(text).toContain('Autre');
  });

  it('trouve un lien contact du même domaine, en absolu', () => {
    const html = '<body><a href="/contact">Nous contacter</a></body>';
    expect(findContactLink(html, 'https://exemple.fr/')).toBe(
      'https://exemple.fr/contact',
    );
  });

  it('ignore un lien contact externe', () => {
    const html = '<body><a href="https://autre.fr/contact">Contact</a></body>';
    expect(findContactLink(html, 'https://exemple.fr/')).toBeNull();
  });
});

describe('evaluateNap (sous-critère 4.1)', () => {
  it('NAP entièrement cohérent : 6 points', async () => {
    const html = page(
      ORG,
      '<footer>Cabinet Dupont — 10 rue de la Paix, 75002 Paris — 01 23 45 67 89</footer>',
    );
    const res = await evaluateNap(html, 'https://exemple.fr/', noFetch);
    expect(res.points).toBe(6);
    expect(res.nom.coherent).toBe(true);
    expect(res.telephone.coherent).toBe(true);
    expect(res.adresse.coherent).toBe(true);
  });

  it('téléphone différent entre Schema.org et footer : 4 points', async () => {
    const html = page(
      ORG,
      '<footer>Cabinet Dupont — 10 rue de la Paix, 75002 Paris — 01 99 99 99 99</footer>',
    );
    const res = await evaluateNap(html, 'https://exemple.fr/', noFetch);
    expect(res.points).toBe(4);
    expect(res.telephone.coherent).toBe(false);
  });

  it('sans Schema.org Organization : 0 point', async () => {
    const html = page(null, '<footer>Cabinet Dupont, 75002 Paris</footer>');
    const res = await evaluateNap(html, 'https://exemple.fr/', noFetch);
    expect(res.points).toBe(0);
    expect(res.schema).toBeNull();
  });

  it('complète le footer avec la page contact du même domaine', async () => {
    const html = page(
      ORG,
      '<footer>© Cabinet Dupont</footer><a href="/contact">Contact</a>',
    );
    const contactFetcher: Fetcher = async (url) =>
      url === 'https://exemple.fr/contact'
        ? {
            ok: true,
            status: 200,
            body: '<body><p>Cabinet Dupont, 10 rue de la Paix, 75002 Paris. Tél : +33 1 23 45 67 89</p></body>',
          }
        : { ok: false, status: 404, body: '' };
    const res = await evaluateNap(html, 'https://exemple.fr/', contactFetcher);
    expect(res.points).toBe(6);
    expect(res.sourceTexte).toBe('footer+contact');
  });

  it('code postal présent mais ville absente du texte : adresse incohérente', async () => {
    const html = page(ORG, '<footer>Cabinet Dupont — 75002 — 01 23 45 67 89</footer>');
    const res = await evaluateNap(html, 'https://exemple.fr/', noFetch);
    expect(res.adresse.coherent).toBe(false);
    expect(res.points).toBe(4);
  });
});
