import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ResponseCache, dayKey } from '../../src/visibility/cache.js';

let tmpDir: string;
let cache: ResponseCache;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parallax-cache-'));
  cache = new ResponseCache(path.join(tmpDir, 'sub', 'cache.sqlite'));
});

afterEach(() => {
  cache.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('dayKey', () => {
  it('format YYYY-MM-DD en UTC', () => {
    expect(dayKey(new Date('2026-07-03T23:59:00Z'))).toBe('2026-07-03');
  });
});

describe('ResponseCache', () => {
  it('crée le dossier et restitue ce qui a été stocké', () => {
    cache.set('gemini:flash', 'ma requête', '2026-07-03', 'la réponse');
    expect(cache.get('gemini:flash', 'ma requête', '2026-07-03')).toBe('la réponse');
  });

  it('miss si la requête, le fournisseur ou le jour diffèrent', () => {
    cache.set('gemini:flash', 'q', '2026-07-03', 'r');
    expect(cache.get('gemini:flash', 'autre', '2026-07-03')).toBeUndefined();
    expect(cache.get('openai:mini', 'q', '2026-07-03')).toBeUndefined();
    expect(cache.get('gemini:flash', 'q', '2026-07-04')).toBeUndefined();
  });

  it('écrase proprement une entrée du même jour (INSERT OR REPLACE)', () => {
    cache.set('p', 'q', '2026-07-03', 'v1');
    cache.set('p', 'q', '2026-07-03', 'v2');
    expect(cache.get('p', 'q', '2026-07-03')).toBe('v2');
  });

  it('persiste entre deux ouvertures de la base', () => {
    const file = path.join(tmpDir, 'persist.sqlite');
    const c1 = new ResponseCache(file);
    c1.set('p', 'q', '2026-07-03', 'r');
    c1.close();
    const c2 = new ResponseCache(file);
    expect(c2.get('p', 'q', '2026-07-03')).toBe('r');
    c2.close();
  });
});
