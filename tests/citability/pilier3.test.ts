import { describe, expect, it } from 'vitest';

import { auditCitability } from '../../src/citability/index.js';

const NOW = new Date('2026-07-03T12:00:00Z');

const HTML = `<html><head>
    <meta property="article:modified_time" content="2026-06-01T00:00:00Z">
  </head><body>
    <h2>Qu'est-ce que le GEO ?</h2>
    <p>Le GEO est une discipline d'optimisation qui vise à rendre un site web
    visible et citable par les grands modèles de langage génératifs.
    Selon une étude de 2025, 40 % des recherches passent déjà par un assistant IA.</p>
  </body></html>`;

describe('auditCitability (Pilier 3 intégré)', () => {
  it('sans classificateur : 3.1 non testé avec la raison, les autres critères notés', async () => {
    const result = await auditCitability({
      url: 'https://exemple.fr/',
      staticHtml: HTML,
      classifierAbsentReason: 'flag --with-claude non passé',
      now: NOW,
    });
    expect(result.max).toBe(25);
    expect(result.details).toHaveLength(4);

    const c31 = result.details.find((d) => d.critere.startsWith('3.1'));
    expect(c31?.statut).toBe('non_teste');
    expect(c31?.preuve).toContain('--with-claude');

    const c33 = result.details.find((d) => d.critere.startsWith('3.3'));
    expect(c33?.points_obtenus).toBeGreaterThanOrEqual(1);
    const c34 = result.details.find((d) => d.critere.startsWith('3.4'));
    expect(c34?.points_obtenus).toBe(5);
  });

  it('avec classificateur : 3.1 noté au prorata des sections', async () => {
    const result = await auditCitability({
      url: 'https://exemple.fr/',
      staticHtml: HTML,
      classifier: async (sections) => sections.map(() => true),
      now: NOW,
    });
    const c31 = result.details.find((d) => d.critere.startsWith('3.1'));
    expect(c31?.points_obtenus).toBe(7);
    expect(c31?.statut).toBeUndefined();
  });

  it('une erreur API marque 3.1 non testé sans faire échouer l\'audit', async () => {
    const result = await auditCitability({
      url: 'https://exemple.fr/',
      staticHtml: HTML,
      classifier: async () => {
        throw new Error('401 authentication_error');
      },
      now: NOW,
    });
    const c31 = result.details.find((d) => d.critere.startsWith('3.1'));
    expect(c31?.statut).toBe('non_teste');
    expect(c31?.preuve).toContain('401');
    expect(result.details).toHaveLength(4);
  });
});
