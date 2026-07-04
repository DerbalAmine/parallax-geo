/**
 * `parallax init` — assistant interactif de configuration des clés API.
 *
 * - Détecte les variables d'environnement existantes (elles restent la
 *   source prioritaire et ne sont jamais copiées dans le fichier).
 * - Propose de saisir les clés manquantes, stockées dans
 *   `~/.parallax/config.json` (global : les clés servent tous les audits,
 *   quel que soit le dossier d'exécution ; permissions 0600). Un
 *   `.parallax/config.json` de projet reste lu en priorité s'il existe.
 * - Tout est optionnel : Parallax fonctionne sans aucune clé (palier 0,
 *   score sur 70 points).
 */

import os from 'node:os';
import path from 'node:path';

import chalk from 'chalk';
import inquirer from 'inquirer';

import { loadFileConfig, saveFileConfig } from '../core/config.js';
import type { FileConfig, ProviderId } from '../core/keys.js';
import { PROVIDERS, detectEnvKey, hasVisibilityProvider, resolveKeys } from '../core/keys.js';

export async function runInit(home: string = os.homedir()): Promise<void> {
  console.log(chalk.bold('\nParallax — configuration des clés API\n'));
  console.log(
    'Toutes les clés sont optionnelles : ' +
      chalk.green('l\'audit de base fonctionne sans aucune clé') +
      ' (score sur 70 points).\n' +
      'Les clés saisies ici sont stockées dans ' +
      chalk.cyan(path.join(home, '.parallax', 'config.json')) +
      ' (global, ignoré par git) et servent tous les audits, quel que soit le dossier.\n',
  );

  const existing = loadFileConfig(home);
  const keys: NonNullable<FileConfig['keys']> = { ...existing.keys };

  for (const provider of PROVIDERS) {
    const fromEnv = detectEnvKey(provider, process.env);
    if (fromEnv) {
      console.log(
        chalk.green('✔') +
          ` ${provider.label} : détectée via ${chalk.cyan(fromEnv.envVar ?? '')}` +
          chalk.dim(' (l\'environnement est prioritaire, rien à stocker)'),
      );
      continue;
    }

    const alreadyStored = Boolean(keys[provider.id]);
    const { action } = await inquirer.prompt<{ action: string }>([
      {
        // inquirer ≥ 12 : le type historique « list » a été renommé « select »
        type: 'select',
        name: 'action',
        message: `${provider.label}\n  ${chalk.dim('Débloque : ' + provider.unlocks)}`,
        choices: [
          ...(alreadyStored
            ? [
                { name: 'Conserver la clé déjà enregistrée', value: 'keep' },
                { name: 'Remplacer la clé', value: 'set' },
                { name: 'Supprimer la clé', value: 'delete' },
              ]
            : [
                { name: 'Saisir une clé', value: 'set' },
                { name: 'Passer (critères marqués « non testé »)', value: 'skip' },
              ]),
        ],
      },
    ]);

    if (action === 'set') {
      const { key } = await inquirer.prompt<{ key: string }>([
        {
          type: 'password',
          name: 'key',
          message: `Clé ${provider.label} :`,
          mask: '*',
        },
      ]);
      const trimmed = key.trim();
      if (trimmed) keys[provider.id] = trimmed;
    } else if (action === 'delete') {
      delete keys[provider.id as ProviderId];
    }
  }

  const config: FileConfig = { ...existing, keys };
  const file = saveFileConfig(home, config);

  const ring = resolveKeys(process.env, config);
  const configured = PROVIDERS.filter((p) => ring[p.id]);

  console.log('\n' + chalk.green('✔') + ` Configuration enregistrée : ${chalk.cyan(file)}\n`);
  console.log(chalk.bold('Récapitulatif des paliers :'));
  console.log(
    `  Palier 0 (sans clé, 70 pts)      : ${chalk.green('toujours disponible')}`,
  );
  console.log(
    `  --with-claude (+7 pts)           : ${ring.claude ? chalk.green('disponible') : chalk.yellow('clé Claude absente')}`,
  );
  console.log(
    `  --deep (sources tierces FR)      : ${ring.serpapi ? chalk.green('disponible') : chalk.yellow('clé SerpAPI absente')}`,
  );
  console.log(
    `  --visibility (Pilier 5)          : ${
      hasVisibilityProvider(ring)
        ? chalk.green(`disponible (${configured.filter((p) => p.id !== 'serpapi').map((p) => p.id).join(', ')})`)
        : chalk.yellow('aucune clé LLM — Gemini recommandé (palier gratuit permanent)')
    }`,
  );
  console.log();
}
