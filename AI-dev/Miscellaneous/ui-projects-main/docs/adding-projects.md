# Adding Projects

You can add new projects to the monorepo by following these steps.

## Using Templates

The easiest way to add a project is to use one of the templates in `projects/_templates/`.

1. **Choose a template**:
   - `plain-html`: For simple static files.
   - `vite-react`: For React apps using Vite.
   - `vite-vue`: For Vue apps using Vite.
   - `next-static`: For Next.js apps with static export.
   - `astro`: For Astro projects.
   - `nuxt-static`: For Nuxt.js apps with static generation.

2. **Copy the template**:
   ```bash
   cp -r projects/_templates/vite-react projects/my-new-demo
   ```

3. **Configure the project**:
   Edit `projects/my-new-demo/project.config.json`. See [Conventions](conventions.md) for field details.

4. **Install dependencies**:
   ```bash
   pnpm install
   ```

## Manual Addition

If you have an existing project:

1. Move the project folder into `projects/`.
2. Add a `project.config.json` to the project root.
3. Ensure the `buildCommand` and `outputDir` in the config match your project's build process.
4. Ensure your framework is configured to use a relative or configurable base path.

## Project Config Schema

Every project must have a `project.config.json`.

```json
{
  "name": "My Project",
  "slug": "my-project",
  "description": "A cool demo",
  "type": "vite",
  "sourceDir": "src",
  "buildCommand": "pnpm build",
  "outputDir": "dist",
  "devCommand": "pnpm dev",
  "tags": ["react", "demo"],
  "visibility": "public",
  "enabled": true
}
```
