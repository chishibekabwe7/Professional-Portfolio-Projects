import Ajv from 'ajv';
import chalk from 'chalk';
import { discoverProjects } from './discover-projects.mjs';

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    slug: { type: 'string', pattern: '^[a-z0-9-]+$' },
    description: { type: 'string' },
    type: {
      type: 'string',
      enum: ['plain-html', 'vite', 'next-static', 'astro', 'nuxt-static', 'custom']
    },
    sourceDir: { type: 'string' },
    buildCommand: { type: 'string' },
    outputDir: { type: 'string' },
    devCommand: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    visibility: { type: 'string', enum: ['public', 'private'] },
    enabled: { type: 'boolean' },
    adapterOptions: { type: 'object' },
    projectDir: { type: 'string' },
    configPath: { type: 'string' }
  },
  required: ['name', 'slug', 'type', 'buildCommand', 'outputDir'],
  additionalProperties: false,
};

const ajv = new Ajv();
const validate = ajv.compile(schema);

export async function validateProjects() {
  console.log(chalk.blue('Validating projects...'));
  const projects = await discoverProjects();
  const slugs = new Set();
  let hasErrors = false;

  for (const project of projects) {
    const valid = validate(project);
    if (!valid) {
      console.error(chalk.red(`Validation failed for ${project.configPath}:`));
      console.error(validate.errors);
      hasErrors = true;
    }

    if (slugs.has(project.slug)) {
      console.error(chalk.red(`Duplicate slug found: ${project.slug} in ${project.configPath}`));
      hasErrors = true;
    }
    slugs.add(project.slug);
  }

  if (hasErrors) {
    console.error(chalk.red('Validation failed.'));
    process.exit(1);
  }

  console.log(chalk.green(`Successfully validated ${projects.length} projects.`));
  return projects;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validateProjects();
}
