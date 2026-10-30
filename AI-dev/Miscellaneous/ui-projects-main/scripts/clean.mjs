import fs from 'fs-extra';
import chalk from 'chalk';
import path from 'path';
import { globby } from 'globby';

async function clean() {
  console.log(chalk.yellow('Cleaning build artifacts...'));

  const pathsToClean = [
    'site',
    'dist',
    'projects/*/.next',
    'projects/*/dist',
    'projects/*/out',
    'projects/*/.astro',
    'projects/*/.output',
    'projects/*/.nuxt',
  ];

  const actualPaths = await globby(pathsToClean, { onlyDirectories: true });

  for (const p of actualPaths) {
    console.log(chalk.gray(`Removing ${p}...`));
    await fs.remove(p);
  }

  console.log(chalk.green('✓ Clean completed.'));
}

clean();
