import chalk from 'chalk';
import fs from 'fs-extra';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { validateProjects } from './validate-projects.mjs';
import { buildProject } from './build-project.mjs';
import { generateIndex } from './generate-index.mjs';

const argv = yargs(hideBin(process.argv))
  .option('repo-name', { type: 'string', default: process.env.REPO_NAME || 'repo' })
  .argv;

async function main() {
  console.log(chalk.bold.magenta('\n🚀 Starting full site build...\n'));

  const repoName = argv['repo-name'];
  console.log(chalk.gray(`Repository Name: ${repoName}`));

  // 1. Clean site directory
  await fs.ensureDir('site');
  await fs.emptyDir('site');

  // 2. Validate projects
  const projects = await validateProjects();

  // 3. Build each project
  for (const project of projects) {
    try {
      await buildProject(project, repoName);
    } catch (error) {
      console.error(chalk.red(`\n❌ Build failed for project: ${project.slug}`));
      if (process.env.CI) {
        process.exit(1);
      }
    }
  }

  // 4. Generate index page
  await generateIndex(projects);

  console.log(chalk.bold.green('\n✨ Full build completed successfully!\n'));
  console.log(chalk.cyan(`Preview directory: ./site/`));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
