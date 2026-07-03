import { describe, expect, it } from 'vitest';

import { auditAuthority } from '../../src/authority/index.js';
import type { Fetcher } from '../../src/core/fetch.js';

const noFetch: Fetcher = async () => ({ ok: false, status: 404, body: '' });

const ORG = JSON.stringify({
  '@type': 'Organization',
  name: 'Cabinet Dupont',
  telephone: '01 23 45 67 89',
  address: { '@type': 'PostalAddress', postalCode: '75002', addressLocality: 'Paris' },
});

describe('auditAuthority (Pilier 4, Phase 3)', () => {
  it('site français exemplaire : 12/20 (4.3 non testé)', async () => {
    const html = `<html><head>
        <meta name="author" content="Jeanne Martin">
        <script type="application/ld+json">${ORG}</script>
      </head><body>
        <a href="/a-propos">À propos</a>
        <p>SIRET : 123 456 789 00012</p>
        <footer>Cabinet Dupont — 75002 Paris — 01 23 45 67 89</footer>
      </body></html>`;
    const result = await auditAuthority({
      url: 'https://exemple.fr/',
      staticHtml: html,
      fetcher: noFetch,
    });
    expect(result.score).toBe(12);
    expect(result.max).toBe(20);
    expect(result.details).toHaveLength(3);
    const c43 = result.details.find((d) => d.critere.startsWith('4.3'));
    expect(c43?.statut).toBe('non_teste');
  });

  it('page sans aucun signal : 0/20, l\'audit aboutit', async () => {
    const result = await auditAuthority({
      url: 'https://exemple.fr/',
      staticHtml: '<html><body><p>rien</p></body></html>',
      fetcher: noFetch,
    });
    expect(result.score).toBe(0);
    expect(result.details).toHaveLength(3);
  });
});
