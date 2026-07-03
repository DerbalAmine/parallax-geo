import { describe, expect, it } from 'vitest';

import { evaluateSchema } from '../../src/semantic/schema.js';

const withJsonLd = (...blocks: string[]) =>
  `<html><head>${blocks
    .map((b) => `<script type="application/ld+json">${b}</script>`)
    .join('')}</head><body></body></html>`;

describe('evaluateSchema (sous-critère 2.2)', () => {
  it('Organization : 3 points', () => {
    const res = evaluateSchema(
      withJsonLd('{"@context":"https://schema.org","@type":"Organization","name":"ACME"}'),
    );
    expect(res.pointsOrganization).toBe(3);
    expect(res.points).toBe(3);
  });

  it('LocalBusiness compte comme Organization', () => {
    const res = evaluateSchema(withJsonLd('{"@type":"LocalBusiness"}'));
    expect(res.pointsOrganization).toBe(3);
  });

  it('FAQPage : 3 points, Article : 2 points, cumulables jusqu\'à 8', () => {
    const res = evaluateSchema(
      withJsonLd(
        '{"@type":"Organization"}',
        '{"@type":"FAQPage"}',
        '{"@type":"Article"}',
      ),
    );
    expect(res.points).toBe(8);
  });

  it('BlogPosting compte comme Article', () => {
    const res = evaluateSchema(withJsonLd('{"@type":"BlogPosting"}'));
    expect(res.pointsArticle).toBe(2);
  });

  it('détecte les types dans un @graph', () => {
    const res = evaluateSchema(
      withJsonLd('{"@graph":[{"@type":"Organization"},{"@type":"FAQPage"}]}'),
    );
    expect(res.points).toBe(6);
  });

  it('gère @type en tableau', () => {
    const res = evaluateSchema(withJsonLd('{"@type":["Organization","Brand"]}'));
    expect(res.pointsOrganization).toBe(3);
  });

  it('un bloc JSON invalide est ignoré sans faire échouer l\'analyse', () => {
    const res = evaluateSchema(
      withJsonLd('{pas du json', '{"@type":"FAQPage"}'),
    );
    expect(res.points).toBe(3);
  });

  it('aucun bloc : 0 point', () => {
    expect(evaluateSchema('<html><body></body></html>').points).toBe(0);
  });
});
