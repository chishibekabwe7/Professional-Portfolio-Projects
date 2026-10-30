import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('slug', { type: 'string' })
  .option('repo-name', { type: 'string', default: process.env.REPO_NAME || 'repo' })
  .argv;

export async function buildProject(project, repoName) {
  const { slug, type, projectDir, buildCommand, outputDir } = project;
  const basePath = `/${repoName}/${slug}/`.replace(/\/+/g, '/');

  console.log(chalk.cyan(`Building project: ${slug} (${type})`));
  console.log(chalk.gray(`Base path: ${basePath}`));

  const env = {
    ...process.env,
    BASE_PATH: basePath,
    PUBLIC_URL: basePath, // For some older setups
    VITE_BASE: basePath,  // For Vite
    NEXT_PUBLIC_BASE_PATH: basePath, // For Next.js
  };

  try {
    // Framework specific adjustments before build if needed
    if (type === 'plain-html') {
      // Nothing to build, just prepare for copy
    } else {
      console.log(chalk.gray(`Running: ${buildCommand}`));
      execSync(buildCommand, {
        cwd: projectDir,
        stdio: 'inherit',
        env
      });
    }

    // Move output to site/<slug>
    const fullOutputDir = path.resolve(projectDir, outputDir);
    const targetDir = path.resolve('site', slug);

    if (fs.existsSync(fullOutputDir)) {
      await fs.ensureDir(targetDir);
      await fs.emptyDir(targetDir);
      await fs.copy(fullOutputDir, targetDir);
      console.log(chalk.green(`✓ Project ${slug} built and moved to site/${slug}`));
    } else if (type === 'plain-html') {
        // For plain-html, if outputDir is same as sourceDir or '.', we copy source files
        const sourcePath = path.resolve(projectDir, project.sourceDir || '.');
        await fs.ensureDir(targetDir);
        await fs.emptyDir(targetDir);
        await fs.copy(sourcePath, targetDir, {
            filter: (src) => !src.includes('node_modules') && !src.includes('project.config.json') && !src.includes('package.json')
        });
        console.log(chalk.green(`✓ Project ${slug} copied to site/${slug}`));
    } else {
      throw new Error(`Output directory ${fullOutputDir} not found after build.`);
    }
  } catch (error) {
    console.error(chalk.red(`✗ Failed to build project ${slug}:`));
    console.error(error.message);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { discoverProjects } = await import('./discover-projects.mjs');
  const projects = await discoverProjects();
  const project = projects.find(p => p.slug === argv.slug);

  if (!project) {
    console.error(chalk.red(`Project with slug "${argv.slug}" not found.`));
    process.exit(1);
  }

  buildProject(project, argv['repo-name']).catch(() => process.exit(1));
}
