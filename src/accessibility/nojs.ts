/**
 * Sous-critère 1.3 — Contenu accessible sans JavaScript (7 points).
 *
 * Méthode : ratio = longueur du texte utile du HTML brut / longueur du texte
 * utile après rendu Playwright.
 * Barème : ratio > 0.8 ⇒ 7 pts ; entre 0.4 et 0.8 ⇒ 4 pts ; < 0.4 ⇒ 0 pt.
 */

export interface NoJsScore {
  ratio: number;
  points: number;
}

export function scoreNoJs(staticLength: number, renderedLength: number): NoJsScore {
  // Page sans texte rendu : rien ne dépend de JS, on considère le contenu
  // intégralement accessible (ratio 1).
  const ratio =
    renderedLength === 0 ? 1 : Math.min(1, staticLength / renderedLength);
  let points = 0;
  if (ratio > 0.8) points = 7;
  else if (ratio >= 0.4) points = 4;
  return { ratio, points };
}
