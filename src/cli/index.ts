/**
 * Point d'entrée du CLI Parallax.
 *
 * Commandes :
 *   parallax audit <url>   Audit GEO — sans clé API : score sur 70 points.
 *   parallax init          Assistant de configuration des clés API.
 */

import fs from 'node:fs';

import chalk from 'chalk';
import { Command } from 'commander';

import { auditAccessibility } from '../accessibility/index.js';
import { auditAuthority } from '../authority/index.js';
import { buildClaudeClassifier } from '../citability/direct-answers.js';
import { auditCitability } from '../citability/index.js';
import { loadKeyRing } from '../core/config.js';
import { httpFetch } from '../core/fetch.js';
import { hasVisibilityProvider } from '../core/keys.js';
import { renderWithPlaywright } from '../core/render.js';
import { niveau } from '../core/scoring.js';
import type { Rapport } from '../core/types.js';
import { emptyPilier, round1 } from '../core/types.js';
import { auditSemantic } from '../semantic/index.js';
import { runInit } from './init.js';
import { printPilier, printPilierAVenir } from './report.js';

const program = new Command();

program
  .name('parallax')
  .description(
    'Audit GEO (Generative Engine Optimization) — mesure la visibilité et la ' +
      'citabilité de votre site par les LLM. Fonctionne sans clé API.',
  )
  .version('0.1.0');

program
  .command('init')
  .description('Assistant interactif de configuration des clés API (toutes optionnelles)')
  .action(async () => {
    await runInit();
  });

program
  .command('audit')
  .description('Audite une URL — sans clé API : score sur 70 points')
  .argument('<url>', 'URL du site à auditer')
  .option('--with-claude', 'Débloque le sous-critère 3.1 (+7 points, clé Claude requise)')
  .option('--deep', 'Sous-critère 4.3, sources tierces françaises (clé SerpAPI requise)')
  .option('--visibility', 'Active le Pilier 5 complet (au moins une clé LLM requise)')
  .option('--json <fichier>', 'Exporte le rapport JSON structuré')
  .option('--markdown <fichier>', 'Exporte le rapport au format markdown')
  .action(async (url: string, options: AuditOptions) => {
    await runAudit(url, options);
  });

interface AuditOptions {
  withClaude?: boolean;
  deep?: boolean;
  visibility?: boolean;
  json?: string;
  markdown?: string;
}

async function runAudit(url: string, options: AuditOptions): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url.includes('://') ? url : `https://${url}`);
  } catch {
    console.error(chalk.red(`URL invalide : ${url}`));
    process.exitCode = 1;
    return;
  }

  const ring = loadKeyRing(process.cwd());

  // Les flags dépendant d'une clé absente n'interrompent jamais l'audit :
  // les critères concernés seront marqués « non testé, clé API absente ».
  if (options.withClaude && !ring.claude) {
    console.log(
      chalk.yellow('⚠ --with-claude : clé Claude absente — sous-critère 3.1 marqué « non testé ».'),
    );
  }
  if (options.deep && !ring.serpapi) {
    console.log(
      chalk.yellow('⚠ --deep : clé SerpAPI absente — sous-critère 4.3 marqué « non testé ».'),
    );
  }
  if (options.visibility && !hasVisibilityProvider(ring)) {
    console.log(
      chalk.yellow(
        '⚠ --visibility : aucune clé LLM disponible — Pilier 5 marqué « non testé ». ' +
          'Astuce : Gemini offre un palier gratuit permanent (parallax init).',
      ),
    );
  }

  console.log(chalk.bold(`\nParallax — audit GEO de ${parsed.href}`));

  const page = await httpFetch(parsed.href);
  if (!page.ok) {
    console.error(
      chalk.red(
        `\nImpossible de récupérer la page (HTTP ${page.status || 'réseau injoignable'}).`,
      ),
    );
    process.exitCode = 1;
    return;
  }

  console.log(chalk.dim('Analyse en cours (robots.txt, llms.txt, rendu Playwright, DOM)…'));

  const withClaude = Boolean(options.withClaude && ring.claude);
  const [accessibilite, semantique, autorite, citabilite] = await Promise.all([
    auditAccessibility({
      url: parsed.href,
      staticHtml: page.body,
      fetcher: httpFetch,
      renderer: renderWithPlaywright,
    }),
    Promise.resolve(auditSemantic(page.body)),
    auditAuthority({ url: parsed.href, staticHtml: page.body, fetcher: httpFetch }),
    auditCitability({
      url: parsed.href,
      staticHtml: page.body,
      ...(withClaude
        ? { classifier: buildClaudeClassifier(ring.claude!.key) }
        : {
            classifierAbsentReason: options.withClaude
              ? 'clé API Claude absente (parallax init)'
              : 'flag --with-claude non passé',
          }),
    }),
  ]);

  printPilier('Pilier 1 · Accessibilité IA', accessibilite);
  printPilier('Pilier 2 · Structure sémantique', semantique);
  printPilier('Pilier 3 · Citabilité du contenu', citabilite);
  printPilier('Pilier 4 · Autorité et entité', autorite);
  printPilierAVenir('Pilier 5 · Visibilité mesurée', 'Phase 5');

  const partiel = round1(
    accessibilite.score + semantique.score + autorite.score + citabilite.score,
  );
  const maxPalier = withClaude ? 77 : 70;
  console.log(
    chalk.bold(`\nScore (palier ${withClaude ? '1' : '0'}) : ${partiel}/${maxPalier}`) +
      chalk.dim(
        ' — hors 4.3 (--deep) et Pilier 5 (--visibility) ; score /100 et niveaux en Phase 6\n',
      ),
  );

  if (options.json) {
    const rapport: Rapport = {
      url: parsed.href,
      audited_at: new Date().toISOString(),
      langue_detectee: 'indeterminee',
      score_global: partiel,
      niveau: niveau(partiel),
      plafond_applique: false,
      piliers: {
        accessibilite_ia: accessibilite,
        structure_semantique: semantique,
        citabilite_contenu: citabilite,
        autorite_entite: autorite,
        visibilite_mesuree: emptyPilier('visibilite_mesuree'),
      },
      recommandations: [],
    };
    fs.writeFileSync(options.json, JSON.stringify(rapport, null, 2) + '\n');
    console.log(chalk.dim(`Rapport JSON écrit : ${options.json}`));
  }
  if (options.markdown) {
    console.log(
      chalk.yellow('Export markdown : disponible en Phase 6.'),
    );
  }
}

await program.parseAsync(process.argv);
