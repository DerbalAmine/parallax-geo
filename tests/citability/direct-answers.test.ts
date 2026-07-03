import { describe, expect, it } from 'vitest';

import {
  buildPrompt,
  evaluateDirectAnswers,
  parseClassifierResponse,
  MAX_SECTIONS,
} from '../../src/citability/direct-answers.js';
import { extractSections, splitSentences } from '../../src/citability/sections.js';

const page = (body: string) => `<html><body>${body}</body></html>`;

describe('extractSections', () => {
  it('associe chaque titre aux deux premières phrases qui suivent', () => {
    const sections = extractSections(
      page(
        '<h2>Quel est le délai légal ?</h2>' +
          '<p>Le délai est de trente jours. Il court à compter de la réception. Des exceptions existent.</p>' +
          '<h2>Combien ça coûte ?</h2><p>Le tarif de base est de 100 euros.</p>',
      ),
    );
    expect(sections).toHaveLength(2);
    expect(sections[0]?.titre).toBe('Quel est le délai légal ?');
    expect(sections[0]?.ouverture).toBe(
      'Le délai est de trente jours. Il court à compter de la réception.',
    );
  });

  it('ignore un titre sans contenu', () => {
    const sections = extractSections(page('<h2>Titre orphelin</h2><h2>Autre</h2><p>Texte.</p>'));
    expect(sections).toHaveLength(1);
    expect(sections[0]?.titre).toBe('Autre');
  });
});

describe('splitSentences', () => {
  it('découpe sur . ! ? en gardant la ponctuation', () => {
    expect(splitSentences('Un. Deux ! Trois ? Quatre')).toEqual([
      'Un.', 'Deux !', 'Trois ?', 'Quatre',
    ]);
  });
});

describe('parseClassifierResponse', () => {
  it('parse un tableau JSON propre', () => {
    expect(parseClassifierResponse('[true,false,true]', 3)).toEqual([true, false, true]);
  });

  it('tolère du texte autour du tableau', () => {
    expect(parseClassifierResponse('Voici :\n[true, false]\nVoilà.', 2)).toEqual([true, false]);
  });

  it('rejette un tableau de mauvaise taille ou de mauvais type', () => {
    expect(() => parseClassifierResponse('[true]', 2)).toThrow();
    expect(() => parseClassifierResponse('[1,0]', 2)).toThrow();
    expect(() => parseClassifierResponse('aucun tableau', 1)).toThrow();
  });
});

describe('evaluateDirectAnswers (sous-critère 3.1)', () => {
  const sections = [
    { titre: 'Q1', ouverture: 'R1.' },
    { titre: 'Q2', ouverture: 'R2.' },
    { titre: 'Q3', ouverture: 'R3.' },
    { titre: 'Q4', ouverture: 'R4.' },
  ];

  it('score = 7 × (réponses directes / sections)', async () => {
    const res = await evaluateDirectAnswers(sections, async () => [true, true, false, false]);
    expect(res.points).toBe(3.5); // 7 × 2/4
    expect(res.directAnswers).toBe(2);
  });

  it('aucune section : 0 point sans appel API', async () => {
    let called = false;
    const res = await evaluateDirectAnswers([], async () => {
      called = true;
      return [];
    });
    expect(res.points).toBe(0);
    expect(called).toBe(false);
  });

  it('plafonne le nombre de sections classifiées', async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ titre: `T${i}`, ouverture: 'O.' }));
    let received = 0;
    await evaluateDirectAnswers(many, async (s) => {
      received = s.length;
      return s.map(() => true);
    });
    expect(received).toBe(MAX_SECTIONS);
  });

  it('le prompt numérote les sections et exige un tableau JSON', () => {
    const prompt = buildPrompt(sections.slice(0, 2));
    expect(prompt).toContain('Section 1');
    expect(prompt).toContain('Section 2');
    expect(prompt).toContain('tableau JSON');
  });
});
