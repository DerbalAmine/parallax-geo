import { describe, expect, it } from 'vitest';

import {
  QueriesFileError,
  hasInlineQueryFlags,
  inlineIcpConfig,
} from '../../src/visibility/queries.js';

const URL_AUDITEE = 'https://www.alan.com/sante';

describe('hasInlineQueryFlags', () => {
  it('détecte --brand ou --query, ignore --domain seul et les vides', () => {
    expect(hasInlineQueryFlags({ brand: 'Alan' })).toBe(true);
    expect(hasInlineQueryFlags({ query: ['question ?'] })).toBe(true);
    expect(hasInlineQueryFlags({ domain: 'alan.com' })).toBe(false);
    expect(hasInlineQueryFlags({ brand: '   ', query: [] })).toBe(false);
    expect(hasInlineQueryFlags({})).toBe(false);
  });
});

describe('inlineIcpConfig', () => {
  it('construit la config depuis --brand et --query répété', () => {
    const config = inlineIcpConfig(
      {
        brand: 'Alan',
        query: [
          'meilleure assurance santé en France',
          'quelle mutuelle pour une startup ?',
        ],
      },
      URL_AUDITEE,
    );
    expect(config.brand).toBe('Alan');
    expect(config.queries).toEqual([
      { text: 'meilleure assurance santé en France' },
      { text: 'quelle mutuelle pour une startup ?' },
    ]);
  });

  it('sans --domain, prend l\'hôte de l\'URL auditée', () => {
    const config = inlineIcpConfig(
      { brand: 'Alan', query: ['q'] },
      URL_AUDITEE,
    );
    expect(config.domain).toBe('www.alan.com');
  });

  it('--domain explicite est normalisé comme dans le fichier', () => {
    const config = inlineIcpConfig(
      { brand: 'Alan', domain: 'https://Alan.com/fr', query: ['q'] },
      URL_AUDITEE,
    );
    expect(config.domain).toBe('alan.com');
  });

  it('--query sans --brand : erreur actionnable', () => {
    expect(() => inlineIcpConfig({ query: ['q'] }, URL_AUDITEE)).toThrow(
      /--query fourni sans --brand/,
    );
  });

  it('--brand sans --query : erreur actionnable', () => {
    expect(() => inlineIcpConfig({ brand: 'Alan' }, URL_AUDITEE)).toThrow(
      /--brand fourni sans --query/,
    );
  });

  it('--query vide : erreur', () => {
    expect(() =>
      inlineIcpConfig({ brand: 'Alan', query: ['q', '  '] }, URL_AUDITEE),
    ).toThrow(/--query vide/);
  });

  it('aucun flag : erreur de type QueriesFileError', () => {
    expect(() => inlineIcpConfig({}, URL_AUDITEE)).toThrow(QueriesFileError);
  });
});
