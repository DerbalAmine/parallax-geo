import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  QueriesFileError,
  loadIcpConfig,
  parseIcpConfig,
} from '../../src/visibility/queries.js';

const YAML_OK = `
brand: "ComplyPME"
domain: "getcomplypme.com"
queries:
  - text: "meilleur outil de conformité AI Act pour PME"
    category: "conformite"
  - text: "comment savoir si mon entreprise est visible sur ChatGPT"
    category: "geo"
`;

describe('parseIcpConfig', () => {
  it('parse le schéma YAML de la grille', () => {
    const config = parseIcpConfig(YAML_OK, 'yaml');
    expect(config.brand).toBe('ComplyPME');
    expect(config.domain).toBe('getcomplypme.com');
    expect(config.queries).toHaveLength(2);
    expect(config.queries[0]?.category).toBe('conformite');
  });

  it('parse l\'équivalent JSON', () => {
    const config = parseIcpConfig(
      JSON.stringify({
        brand: 'ComplyPME',
        domain: 'complypme.fr',
        queries: [{ text: 'audit GEO PME' }],
      }),
      'json',
    );
    expect(config.queries[0]?.text).toBe('audit GEO PME');
    expect(config.queries[0]?.category).toBeUndefined();
  });

  it('normalise le domaine (https://, chemin, casse)', () => {
    const config = parseIcpConfig(
      'brand: X\ndomain: "https://ComplyPME.fr/page"\nqueries:\n  - text: q',
      'yaml',
    );
    expect(config.domain).toBe('complypme.fr');
  });

  it('rejette brand ou domain manquant avec un message clair', () => {
    expect(() =>
      parseIcpConfig('domain: x.fr\nqueries:\n  - text: q', 'yaml'),
    ).toThrow(/brand/);
    expect(() =>
      parseIcpConfig('brand: X\nqueries:\n  - text: q', 'yaml'),
    ).toThrow(/domain/);
  });

  it('rejette une liste de requêtes vide ou une requête sans text', () => {
    expect(() => parseIcpConfig('brand: X\ndomain: x.fr\nqueries: []', 'yaml')).toThrow(
      /queries/,
    );
    expect(() =>
      parseIcpConfig('brand: X\ndomain: x.fr\nqueries:\n  - category: seo', 'yaml'),
    ).toThrow(/text/);
  });

  it('rejette un YAML illisible avec QueriesFileError', () => {
    expect(() => parseIcpConfig('brand: [invalide', 'yaml')).toThrow(QueriesFileError);
  });
});

describe('loadIcpConfig', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parallax-icp-'));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('choisit le format selon l\'extension', () => {
    const yamlFile = path.join(tmpDir, 'q.yaml');
    fs.writeFileSync(yamlFile, YAML_OK);
    expect(loadIcpConfig(yamlFile).brand).toBe('ComplyPME');

    const jsonFile = path.join(tmpDir, 'q.json');
    fs.writeFileSync(
      jsonFile,
      JSON.stringify({ brand: 'X', domain: 'x.fr', queries: [{ text: 'q' }] }),
    );
    expect(loadIcpConfig(jsonFile).brand).toBe('X');
  });

  it('fichier introuvable : QueriesFileError avec le chemin', () => {
    expect(() => loadIcpConfig(path.join(tmpDir, 'absent.yaml'))).toThrow(/introuvable/);
  });
});
