/**
 * Détection de marque dans une réponse LLM (sous-critère 5.1) :
 * regex sur la marque et le domaine + fuzzy matching (Levenshtein),
 * et position dans une liste quand la réponse en contient une.
 *
 * Choix d'implémentation (CHANGELOG) :
 * - comparaison sur formes « compactées » (minuscules, sans accents ni
 *   séparateurs) pour tolérer « Comply PME » / « comply-pme » / « ComplyPME » ;
 * - fuzzy : distance de Levenshtein ≤ 20 % de la longueur de la marque
 *   (minimum 1), sur mots et bigrammes compactés ;
 * - position : rang du premier élément de liste (numéroté ou à puces)
 *   contenant la marque.
 */

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Forme compactée : lettres et chiffres uniquement. */
export function compact(s: string): string {
  return normalize(s).replace(/[^a-z0-9]/g, '');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i, ...new Array<number>(n).fill(0)];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    prev = curr;
  }
  return prev[n]!;
}

export type MatchVia = 'marque' | 'domaine' | 'fuzzy';

export interface BrandMatch {
  cited: boolean;
  via: MatchVia | null;
  /** Rang dans la liste si la marque apparaît dans un élément de liste. */
  position: number | null;
}

function fuzzyMatches(textNorm: string, brandCompact: string): boolean {
  const tolerance = Math.max(1, Math.round(brandCompact.length * 0.2));
  const words = textNorm.split(/[^a-z0-9]+/).filter(Boolean);
  const candidates: string[] = [...words];
  for (let i = 0; i < words.length - 1; i++) {
    candidates.push(words[i]! + words[i + 1]!);
  }
  return candidates.some(
    (c) =>
      Math.abs(c.length - brandCompact.length) <= tolerance &&
      levenshtein(c, brandCompact) <= tolerance,
  );
}

function containsBrand(
  text: string,
  brand: string,
  domain: string,
): MatchVia | null {
  const textNorm = normalize(text);
  const textCompact = compact(text);
  const brandCompact = compact(brand);
  const domainRoot = compact(domain.replace(/^www\./, '').split('.')[0] ?? '');

  if (brandCompact && textCompact.includes(brandCompact)) return 'marque';
  if (domain && textNorm.includes(domain.toLowerCase())) return 'domaine';
  if (domainRoot.length >= 4 && textCompact.includes(domainRoot)) return 'domaine';
  if (brandCompact.length >= 4 && fuzzyMatches(textNorm, brandCompact)) return 'fuzzy';
  return null;
}

const LIST_ITEM_RE = /^\s*(?:(\d+)\s*[.)：:-]|[-*•▪])\s+/;

export function detectBrand(
  response: string,
  brand: string,
  domain: string,
): BrandMatch {
  const via = containsBrand(response, brand, domain);
  if (!via) return { cited: false, via: null, position: null };

  // Position dans une liste : premier élément de liste citant la marque.
  let position: number | null = null;
  let itemIndex = 0;
  for (const line of response.split(/\r?\n/)) {
    const m = LIST_ITEM_RE.exec(line);
    if (!m) continue;
    itemIndex++;
    if (containsBrand(line, brand, domain)) {
      position = m[1] ? Number(m[1]) : itemIndex;
      break;
    }
  }

  return { cited: true, via, position };
}
