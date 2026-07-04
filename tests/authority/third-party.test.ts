import { describe, expect, it } from 'vitest';

import {
  entityNameFromUrl,
  evaluateThirdParty,
  type SearchFn,
} from '../../src/authority/third-party.js';
import { auditAuthority } from '../../src/authority/index.js';
import type { Fetcher } from '../../src/core/fetch.js';

/** Répond selon le type de recherche (wikipedia / annuaires / presse). */
function fakeSearch(data: {
  wikipedia?: string[];
  annuaires?: string[];
  presse?: string[];
}): SearchFn {
  return async (params) => {
    if (params['tbm'] === 'nws') {
      return { news_results: (data.presse ?? []).map((link) => ({ link })) };
    }
    if (params['q']?.includes('wikipedia.org')) {
      return { organic_results: (data.wikipedia ?? []).map((link) => ({ link })) };
    }
    return { organic_results: (data.annuaires ?? []).map((link) => ({ link })) };
  };
}

const noFetch: Fetcher = async () => ({ ok: false, status: 0, body: '' });

describe('evaluateThirdParty', () => {
  it('8/8 : Wikipedia + annuaire + presse abondante', async () => {
    const res = await evaluateThirdParty(
      'ComplyPME',
      fakeSearch({
        wikipedia: ['https://fr.wikipedia.org/wiki/ComplyPME'],
        annuaires: ['https://www.societe.com/societe/complypme.html'],
        presse: [
          'https://www.lesechos.fr/a1',
          'https://www.latribune.fr/a2',
          'https://www.maddyness.com/a3',
        ],
      }),
    );
    expect(res.points).toBe(8);
    expect(res.preuve).toContain('Wikipedia : oui (https://fr.wikipedia.org/wiki/ComplyPME)');
    expect(res.preuve).toContain('annuaires : societe.com');
    expect(res.preuve).toContain('presse : 3 article(s) (lesechos.fr, latribune.fr, maddyness.com)');
  });

  it('2/8 : presse limitée (1-2 articles), rien d\'autre', async () => {
    const res = await evaluateThirdParty(
      'ComplyPME',
      fakeSearch({ presse: ['https://www.lesechos.fr/a1'] }),
    );
    expect(res.points).toBe(2);
    expect(res.preuve).toContain('Wikipedia : non');
    expect(res.preuve).toContain('annuaires : aucun');
    expect(res.preuve).toContain('presse : 1 article(s)');
  });

  it('0/8 : entité absente de toutes les sources', async () => {
    const res = await evaluateThirdParty('ComplyPME', fakeSearch({}));
    expect(res.points).toBe(0);
  });
});

describe('entityNameFromUrl', () => {
  it('prend la racine du domaine sans www ni TLD', () => {
    expect(entityNameFromUrl('https://www.complypme.fr/page')).toBe('complypme');
    expect(entityNameFromUrl('https://societe.co.uk/')).toBe('societe.co');
  });
});

describe('auditAuthority — 4.3', () => {
  const HTML_ORG =
    '<html><body><script type="application/ld+json">' +
    JSON.stringify({ '@type': 'Organization', name: 'ComplyPME' }) +
    '</script></body></html>';

  it('note 4.3 avec le nom Schema.org quand la recherche est fournie', async () => {
    const queries: string[] = [];
    const search: SearchFn = async (params) => {
      queries.push(params['q'] ?? '');
      return {};
    };
    const result = await auditAuthority({
      url: 'https://complypme.fr/',
      staticHtml: HTML_ORG,
      fetcher: noFetch,
      thirdPartySearch: search,
    });
    const d43 = result.details.find((d) => d.critere.startsWith('4.3'));
    expect(d43?.statut).toBeUndefined();
    expect(queries.every((q) => q.includes('"ComplyPME"'))).toBe(true);
  });

  it('erreur SerpAPI ⇒ 4.3 non testé, audit intact', async () => {
    const result = await auditAuthority({
      url: 'https://complypme.fr/',
      staticHtml: HTML_ORG,
      fetcher: noFetch,
      thirdPartySearch: async () => {
        throw new Error('SerpAPI HTTP 401 — Invalid API key');
      },
    });
    const d43 = result.details.find((d) => d.critere.startsWith('4.3'));
    expect(d43?.statut).toBe('non_teste');
    expect(d43?.preuve).toContain('SerpAPI HTTP 401');
  });

  it('sans recherche : non testé avec la raison transmise', async () => {
    const result = await auditAuthority({
      url: 'https://complypme.fr/',
      staticHtml: '<html></html>',
      fetcher: noFetch,
      thirdPartyAbsentReason: 'clé SerpAPI absente (parallax init)',
    });
    const d43 = result.details.find((d) => d.critere.startsWith('4.3'));
    expect(d43?.statut).toBe('non_teste');
    expect(d43?.preuve).toBe('Non testé : clé SerpAPI absente (parallax init)');
  });
});
