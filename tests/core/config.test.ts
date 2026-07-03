import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  configPath,
  loadFileConfig,
  loadKeyRing,
  saveFileConfig,
} from '../../src/core/config.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parallax-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadFileConfig', () => {
  it('retourne une config vide si le fichier est absent', () => {
    expect(loadFileConfig(tmpDir)).toEqual({});
  });

  it('retourne une config vide si le JSON est invalide (l’audit ne doit jamais échouer)', () => {
    fs.mkdirSync(path.dirname(configPath(tmpDir)), { recursive: true });
    fs.writeFileSync(configPath(tmpDir), '{pas du json');
    expect(loadFileConfig(tmpDir)).toEqual({});
  });

  it('relit ce que saveFileConfig a écrit', () => {
    saveFileConfig(tmpDir, { keys: { claude: 'sk-ant-x' } });
    expect(loadFileConfig(tmpDir)).toEqual({ keys: { claude: 'sk-ant-x' } });
  });
});

describe('saveFileConfig', () => {
  it('crée .parallax/config.json avec permissions restreintes', () => {
    const file = saveFileConfig(tmpDir, { keys: {} });
    expect(file).toBe(configPath(tmpDir));
    expect(fs.existsSync(file)).toBe(true);
    const mode = fs.statSync(file).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});

describe('loadKeyRing', () => {
  it('fusionne fichier local et environnement, environnement prioritaire', () => {
    saveFileConfig(tmpDir, {
      keys: { claude: 'file-claude', serpapi: 'file-serp' },
    });
    const ring = loadKeyRing(tmpDir, { ANTHROPIC_API_KEY: 'env-claude' });
    expect(ring.claude?.key).toBe('env-claude');
    expect(ring.claude?.source).toBe('env');
    expect(ring.serpapi?.key).toBe('file-serp');
    expect(ring.serpapi?.source).toBe('config');
  });

  it('sans fichier ni environnement : trousseau vide, pas d’erreur', () => {
    expect(loadKeyRing(tmpDir, {})).toEqual({});
  });
});
