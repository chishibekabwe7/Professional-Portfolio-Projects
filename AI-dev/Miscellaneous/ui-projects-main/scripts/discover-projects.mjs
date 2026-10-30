import { globby } from 'globby';
import fs from 'fs-extra';
import path from 'path';

export async function discoverProjects() {
  const configPaths = await globby('projects/*/project.config.json', {
    ignore: ['projects/_templates/**'],
  });

  const projects = await Promise.all(
    configPaths.map(async (configPath) => {
      const config = await fs.readJson(configPath);
      const projectDir = path.dirname(configPath);
      return {
        ...config,
        projectDir,
        configPath,
      };
    })
  );

  return projects.filter((p) => p.enabled !== false);
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  discoverProjects().then((projects) => {
    console.log(JSON.stringify(projects, null, 2));
  });
}
