import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// inquirer mocké : répond « conserver » ou « passer » à toutes les questions.
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(async (questions: Array<{ choices?: Array<{ value: string }> }>) => {
      const choices = questions[0]?.choices ?? [];
      const keep = choices.find((c) => c.value === 'keep');
      return { action: keep ? 'keep' : 'skip' };
    }),
  },
}));

import { runInit } from '../../src/cli/init.js';

describe('runInit — emplacement de la config', () => {
  let fakeHome: string;
  let cwdAvant: string;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'parallax-home-'));
    cwdAvant = process.cwd();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(cwdAvant);
    fs.rmSync(fakeHome, { recursive: true, force: true });
    logSpy.mockRestore();
  });

  it('écrit dans <home>/.parallax/config.json, pas dans le dossier courant', async () => {
    const fakeCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'parallax-cwd-'));
    process.chdir(fakeCwd);
    try {
      await runInit(fakeHome);
      expect(fs.existsSync(path.join(fakeHome, '.parallax', 'config.json'))).toBe(true);
      expect(fs.existsSync(path.join(fakeCwd, '.parallax'))).toBe(false);
    } finally {
      process.chdir(cwdAvant);
      fs.rmSync(fakeCwd, { recursive: true, force: true });
    }
  });

  it('conserve les clés déjà enregistrées dans la config du home', async () => {
    const dir = path.join(fakeHome, '.parallax');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'config.json'),
      JSON.stringify({ keys: { serpapi: 'clef-existante' } }),
    );
    await runInit(fakeHome);
    const config = JSON.parse(
      fs.readFileSync(path.join(dir, 'config.json'), 'utf8'),
    ) as { keys: Record<string, string> };
    expect(config.keys['serpapi']).toBe('clef-existante');
  });
});
