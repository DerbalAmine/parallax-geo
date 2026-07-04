/**
 * Export markdown du rapport (--markdown <fichier>) — même contenu que le
 * JSON, mis en forme pour lecture humaine ou partage (issue, wiki, e-mail).
 */

import { PLAFOND_MESSAGE } from '../core/scoring.js';
import type { PilierId, PilierResult, Rapport } from '../core/types.js';
import { PILIER_TITRES } from '../core/types.js';
import { NOTE_TRANSPARENCE } from '../visibility/index.js';

/** Une cellule de tableau markdown : pipes échappés, retours ligne aplatis. */
function cell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
}

export function renderMarkdown(rapport: Rapport): string {
  const lines: string[] = [];
  const date = rapport.audited_at.slice(0, 10);

  lines.push(`# Rapport d'audit GEO — ${rapport.url}`);
  lines.push('');
  lines.push(`Audité le ${date} avec Parallax (parallax-geo).`);
  lines.push('');
  lines.push(
    `**Score global : ${rapport.score_global}/100 — niveau ${rapport.niveau.toUpperCase()}**`,
  );
  lines.push('');
  if (rapport.plafond_applique) {
    lines.push(`> ⚠️ ${PLAFOND_MESSAGE}`);
    lines.push('');
  }
  lines.push(
    `Score brut : ${rapport.score_brut} points sur ${rapport.score_max_teste} testés` +
      ' (les critères non testés sont exclus du calcul).',
  );

  for (const [id, pilier] of Object.entries(rapport.piliers) as Array<
    [PilierId, PilierResult]
  >) {
    lines.push('');
    lines.push(`## ${PILIER_TITRES[id]} — ${pilier.score}/${pilier.max}`);
    lines.push('');
    lines.push('| Critère | Points | Preuve |');
    lines.push('| --- | --- | --- |');
    for (const d of pilier.details) {
      const points =
        d.statut === 'non_teste'
          ? 'non testé'
          : `${d.points_obtenus}/${d.points_max}`;
      lines.push(`| ${cell(d.critere)} | ${points} | ${cell(d.preuve)} |`);
    }
  }

  if (rapport.criteres_non_testes.length) {
    lines.push('');
    lines.push('## Critères non testés (exclus du calcul)');
    lines.push('');
    for (const c of rapport.criteres_non_testes) {
      lines.push(`- **${c.critere}** — ${c.raison}`);
    }
  }

  if (rapport.recommandations.length) {
    lines.push('');
    lines.push('## Recommandations (par points manquants)');
    lines.push('');
    lines.push('| Priorité | Critère | Action |');
    lines.push('| --- | --- | --- |');
    for (const r of rapport.recommandations) {
      lines.push(`| ${r.priorite} | ${cell(r.critere)} | ${cell(r.action)} |`);
    }
  }

  const visibiliteTestee = rapport.piliers.visibilite_mesuree.details.some(
    (d) => d.statut !== 'non_teste',
  );
  if (visibiliteTestee) {
    lines.push('');
    lines.push(`> ${NOTE_TRANSPARENCE}`);
  }

  lines.push('');
  return lines.join('\n');
}
