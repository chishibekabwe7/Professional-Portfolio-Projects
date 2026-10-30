import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('template', { type: 'string', alias: 't', demandOption: true })
  .option('slug', { type: 'string', alias: 's', demandOption: true })
  .argv;

async function register() {
  const { template, slug } = argv;
  const templateDir = path.resolve('projects/_templates', template);
  const targetDir = path.resolve('projects', slug);

  if (!fs.existsSync(templateDir)) {
    console.error(chalk.red(`Template "${template}" not found in projects/_templates/`));
    process.exit(1);
  }

  if (fs.existsSync(targetDir)) {
    console.error(chalk.red(`Target directory projects/${slug} already exists.`));
    process.exit(1);
  }

  console.log(chalk.blue(`Creating new project "${slug}" from template "${template}"...`));

  await fs.copy(templateDir, targetDir);

  // Update project.config.json
  const configPath = path.join(targetDir, 'project.config.json');
  if (fs.existsSync(configPath)) {
    const config = await fs.readJson(configPath);
    config.slug = slug;
    config.name = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    await fs.writeJson(configPath, config, { spaces: 2 });
  }

  console.log(chalk.green(`✓ Project ${slug} created successfully!`));
  console.log(chalk.cyan(`Next steps:`));
  console.log(`1. cd projects/${slug}`);
  console.log(`2. pnpm install (if needed)`);
  console.log(`3. Update your project code!`);
}

register();
