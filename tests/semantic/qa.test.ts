import { describe, expect, it } from 'vitest';

import { countTextQuestions, evaluateQa } from '../../src/semantic/qa.js';

const page = (body: string) => `<html><body>${body}</body></html>`;

const reponse =
  'La réponse détaillée explique le fonctionnement du dispositif et donne les conditions précises d\'éligibilité pour les entreprises concernées.';

describe('countTextQuestions', () => {
  it('compte une question suivie d\'un paragraphe de réponse', () => {
    expect(
      countTextQuestions(`Comment fonctionne le crédit d'impôt ? ${reponse}`),
    ).toBe(1);
  });

  it('ignore une question sans réponse substantielle', () => {
    expect(countTextQuestions('Une question ? Oui.')).toBe(0);
  });

  it('ignore une suite de questions sans réponses', () => {
    expect(
      countTextQuestions('Première question ? Deuxième question ? Troisième ?'),
    ).toBe(0);
  });
});

describe('evaluateQa (sous-critère 2.4)', () => {
  it('compte les balises details/summary', () => {
    const res = evaluateQa(
      page(
        '<details><summary>Question 1</summary><p>R</p></details>' +
          '<details><summary>Question 2</summary><p>R</p></details>',
      ),
    );
    expect(res.detailsSummary).toBe(2);
    expect(res.points).toBeGreaterThanOrEqual(2);
  });

  it('compte les classes CSS faq/question/accordion', () => {
    const res = evaluateQa(
      page('<div class="faq-item"></div><section class="accordion"></section>'),
    );
    expect(res.faqClassElements).toBe(2);
  });

  it('plafonne à 4 points quel que soit le nombre de patterns', () => {
    const res = evaluateQa(
      page('<div class="faq"></div>'.repeat(10)),
    );
    expect(res.totalPatterns).toBe(10);
    expect(res.points).toBe(4);
  });

  it('page sans aucun pattern : 0 point', () => {
    expect(evaluateQa(page('<p>Texte simple sans question.</p>')).points).toBe(0);
  });

  it('cumule questions texte et patterns DOM', () => {
    const res = evaluateQa(
      page(
        `<p>Quels sont les délais de livraison ? ${reponse}</p>` +
          '<details><summary>FAQ</summary><p>R</p></details>',
      ),
    );
    expect(res.textQuestions).toBe(1);
    expect(res.detailsSummary).toBe(1);
  });
});
