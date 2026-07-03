import { describe, expect, it } from 'vitest';

import {
  PROVIDERS,
  detectEnvKey,
  hasVisibilityProvider,
  resolveKeys,
} from '../../src/core/keys.js';

const provider = (id: string) => {
  const p = PROVIDERS.find((p) => p.id === id);
  if (!p) throw new Error(`fournisseur inconnu : ${id}`);
  return p;
};

describe('detectEnvKey', () => {
  it('détecte une clé présente dans l’environnement', () => {
    const found = detectEnvKey(provider('claude'), {
      ANTHROPIC_API_KEY: 'sk-ant-test',
    });
    expect(found).toEqual({
      provider: 'claude',
      key: 'sk-ant-test',
      source: 'env',
      envVar: 'ANTHROPIC_API_KEY',
    });
  });

  it('retourne undefined si la variable est absente ou vide', () => {
    expect(detectEnvKey(provider('claude'), {})).toBeUndefined();
    expect(
      detectEnvKey(provider('claude'), { ANTHROPIC_API_KEY: '   ' }),
    ).toBeUndefined();
  });

  it('respecte l’ordre de priorité des variables (GEMINI_API_KEY avant GOOGLE_API_KEY)', () => {
    const found = detectEnvKey(provider('gemini'), {
      GOOGLE_API_KEY: 'google-key',
      GEMINI_API_KEY: 'gemini-key',
    });
    expect(found?.key).toBe('gemini-key');
    expect(found?.envVar).toBe('GEMINI_API_KEY');
  });

  it('accepte la variable de repli (GOOGLE_API_KEY seule)', () => {
    const found = detectEnvKey(provider('gemini'), {
      GOOGLE_API_KEY: 'google-key',
    });
    expect(found?.envVar).toBe('GOOGLE_API_KEY');
  });
});

describe('resolveKeys', () => {
  it('sans clé du tout, retourne un trousseau vide (palier 0 : jamais une erreur)', () => {
    expect(resolveKeys({}, {})).toEqual({});
  });

  it('l’environnement a priorité sur le fichier de config', () => {
    const ring = resolveKeys(
      { ANTHROPIC_API_KEY: 'env-key' },
      { keys: { claude: 'file-key' } },
    );
    expect(ring.claude?.key).toBe('env-key');
    expect(ring.claude?.source).toBe('env');
  });

  it('utilise le fichier quand l’environnement ne fournit rien', () => {
    const ring = resolveKeys({}, { keys: { serpapi: 'serp-key' } });
    expect(ring.serpapi?.key).toBe('serp-key');
    expect(ring.serpapi?.source).toBe('config');
  });

  it('ignore les clés vides du fichier', () => {
    const ring = resolveKeys({}, { keys: { openai: '  ' } });
    expect(ring.openai).toBeUndefined();
  });

  it('résout des clés partielles sans exiger les autres', () => {
    const ring = resolveKeys(
      { PERPLEXITY_API_KEY: 'pplx-key' },
      { keys: { serpapi: 'serp-key' } },
    );
    expect(Object.keys(ring).sort()).toEqual(['perplexity', 'serpapi']);
  });
});

describe('hasVisibilityProvider', () => {
  it('vrai dès qu’une clé LLM est présente', () => {
    for (const envVar of [
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY',
      'GEMINI_API_KEY',
      'PERPLEXITY_API_KEY',
    ]) {
      const ring = resolveKeys({ [envVar]: 'k' }, {});
      expect(hasVisibilityProvider(ring)).toBe(true);
    }
  });

  it('faux avec seulement SerpAPI (pas un fournisseur LLM)', () => {
    const ring = resolveKeys({ SERPAPI_API_KEY: 'k' }, {});
    expect(hasVisibilityProvider(ring)).toBe(false);
  });

  it('faux sans aucune clé', () => {
    expect(hasVisibilityProvider({})).toBe(false);
  });
});
