/**
 * Point d'entrée du CLI Parallax.
 *
 * Commandes :
 *   parallax audit <url>   Audit GEO — sans clé API : score sur 70 points.
 *   parallax init          Assistant de configuration des clés API.
 */

import chalk from 'chalk';
import { Command } from 'commander';

import { loadKeyRing } from '../core/config.js';
import { hasVisibilityProvider } from '../core/keys.js';
import { runInit } from './init.js';

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

  console.log(chalk.bold(`\nParallax — audit GEO de ${parsed.href}\n`));
  console.log(
    chalk.dim(
      'Les piliers d\'analyse arrivent en Phase 2 (accessibilité IA, structure sémantique). ' +
        'Squelette CLI en place.',
    ),
  );
}

await program.parseAsync(process.argv);
