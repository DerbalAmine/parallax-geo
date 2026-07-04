/**
 * Point d'entrée du CLI Parallax.
 *
 * Commandes :
 *   parallax audit <url>   Audit GEO — sans clé API : score sur 70 points.
 *   parallax init          Assistant de configuration des clés API.
 */

import fs from 'node:fs';
import path from 'node:path';

import chalk from 'chalk';
import { Command } from 'commander';

import { auditAccessibility } from '../accessibility/index.js';
import { auditAuthority } from '../authority/index.js';
import { serpApiSearch } from '../authority/third-party.js';
import { buildClaudeClassifier } from '../citability/direct-answers.js';
import { auditCitability } from '../citability/index.js';
import { loadKeyRing } from '../core/config.js';
import { httpFetch } from '../core/fetch.js';
import { hasVisibilityProvider } from '../core/keys.js';
import { detectLanguage } from '../core/language.js';
import type { CitationStats } from '../core/rapport.js';
import { buildRapport } from '../core/rapport.js';
import { renderWithPlaywright } from '../core/render.js';
import { extractText } from '../core/text.js';
import { emptyPilier } from '../core/types.js';
import { auditSemantic } from '../semantic/index.js';
import { ResponseCache } from '../visibility/cache.js';
import { NOTE_TRANSPARENCE, auditVisibility } from '../visibility/index.js';
import { buildProviders } from '../visibility/providers.js';
import {
  QueriesFileError,
  hasInlineQueryFlags,
  inlineIcpConfig,
  loadIcpConfig,
} from '../visibility/queries.js';
import { runInit } from './init.js';
import { renderMarkdown } from './markdown.js';
import { printPilier, printScoreFinal } from './report.js';

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
  .option(
    '--queries <fichier>',
    'Fichier de requêtes ICP pour --visibility (YAML par défaut, JSON selon l\'extension) — prioritaire sur --brand/--query',
  )
  .option('--brand <nom>', 'Marque à détecter pour --visibility (alternative au fichier)')
  .option(
    '--domain <domaine>',
    'Domaine de la marque pour --visibility (défaut : hôte de l\'URL auditée)',
  )
  .option(
    '--query <texte>',
    'Question ICP pour --visibility, répétable pour en poser plusieurs',
    (valeur: string, precedentes: string[]) => [...precedentes, valeur],
    [] as string[],
  )
  .option('--json <fichier>', 'Exporte le rapport JSON structuré')
  .option('--markdown <fichier>', 'Exporte le rapport au format markdown')
  .action(async (url: string, options: AuditOptions) => {
    await runAudit(url, options);
  });

interface AuditOptions {
  withClaude?: boolean;
  deep?: boolean;
  visibility?: boolean;
  queries?: string;
  brand?: string;
  domain?: string;
  query?: string[];
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
    auditAuthority({
      url: parsed.href,
      staticHtml: page.body,
      fetcher: httpFetch,
      ...(options.deep && ring.serpapi
        ? { thirdPartySearch: serpApiSearch(ring.serpapi.key) }
        : {
            thirdPartyAbsentReason: options.deep
              ? 'clé SerpAPI absente (parallax init)'
              : 'flag --deep non passé',
          }),
    }),
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

  // Pilier 5 (--visibility) : séquentiel, après les piliers statiques.
  let visibilite = emptyPilier('visibilite_mesuree');
  let visibilityRan = false;
  let citationStats: CitationStats | undefined;
  const visNonTeste = (raison: string): void => {
    visibilite.details.push({
      critere: '5.1 Taux de citation sur panel de requêtes',
      points_obtenus: 0,
      points_max: 15,
      methode:
        'Requêtes ICP envoyées séquentiellement aux APIs configurées, détection de marque (regex + fuzzy), score = taux de citation × 15',
      preuve: `Non testé : ${raison}`,
      statut: 'non_teste',
    });
  };
  const inlineFlags = {
    ...(options.brand !== undefined ? { brand: options.brand } : {}),
    ...(options.domain !== undefined ? { domain: options.domain } : {}),
    ...(options.query !== undefined ? { query: options.query } : {}),
  };
  if (!options.visibility) {
    visNonTeste('flag --visibility non passé');
  } else {
    if (!hasVisibilityProvider(ring)) {
      visNonTeste('aucune clé LLM disponible (parallax init)');
    } else if (!options.queries && !hasInlineQueryFlags(inlineFlags)) {
      console.log(
        chalk.yellow(
          '⚠ --visibility : requêtes ICP manquantes — passez --queries <fichier>, ou --brand + --query en ligne de commande.',
        ),
      );
      visNonTeste('requêtes ICP manquantes (--queries <fichier>, ou --brand + --query)');
    } else {
      try {
        if (options.queries && hasInlineQueryFlags(inlineFlags)) {
          console.log(
            chalk.yellow(
              '⚠ --queries et --brand/--query fournis ensemble : le fichier prend priorité, les flags sont ignorés.',
            ),
          );
        }
        const config = options.queries
          ? loadIcpConfig(options.queries)
          : inlineIcpConfig(inlineFlags, parsed.href);
        const { providers, missing } = buildProviders(ring);
        const cache = new ResponseCache(
          path.join(process.cwd(), '.parallax', 'cache.sqlite'),
        );
        console.log(
          chalk.dim(
            `Pilier 5 : ${config.queries.length} requête(s) × ${providers.length} fournisseur(s) — ${providers.map((p) => p.id).join(', ')}`,
          ),
        );
        try {
          const result = await auditVisibility({
            config,
            providers,
            missing,
            cache,
            log: (m) => console.log(chalk.dim(m)),
          });
          visibilite = result.pilier;
          citationStats = result.stats;
          visibilityRan = true;
        } finally {
          cache.close();
        }
      } catch (err) {
        if (err instanceof QueriesFileError) {
          console.log(chalk.yellow(`⚠ --visibility : ${err.message}`));
          visNonTeste(err.message);
        } else {
          throw err;
        }
      }
    }
  }

  printPilier('Pilier 1 · Accessibilité IA', accessibilite);
  printPilier('Pilier 2 · Structure sémantique', semantique);
  printPilier('Pilier 3 · Citabilité du contenu', citabilite);
  printPilier('Pilier 4 · Autorité et entité', autorite);
  printPilier('Pilier 5 · Visibilité mesurée', visibilite);
  if (visibilityRan) {
    console.log('\n' + chalk.dim(NOTE_TRANSPARENCE));
  }

  const rapport = buildRapport({
    url: parsed.href,
    langueDetectee: detectLanguage(extractText(page.body)),
    ...(citationStats ? { citationStats } : {}),
    piliers: {
      accessibilite_ia: accessibilite,
      structure_semantique: semantique,
      citabilite_contenu: citabilite,
      autorite_entite: autorite,
      visibilite_mesuree: visibilite,
    },
  });

  printScoreFinal(rapport);

  if (options.json) {
    fs.writeFileSync(options.json, JSON.stringify(rapport, null, 2) + '\n');
    console.log(chalk.dim(`Rapport JSON écrit : ${options.json}`));
  }
  if (options.markdown) {
    fs.writeFileSync(options.markdown, renderMarkdown(rapport));
    console.log(chalk.dim(`Rapport markdown écrit : ${options.markdown}`));
  }
}

await program.parseAsync(process.argv);
