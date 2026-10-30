# Conventions

To maintain a healthy monorepo, please follow these conventions.

## Project Metadata (`project.config.json`)

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Human-readable project name. |
| `slug` | string | URL-safe name (used for folder and path). |
| `description`| string | Short summary (shown on index page). |
| `type` | string | Framework type (see below). |
| `sourceDir` | string | Directory where source files live. |
| `buildCommand` | string | Command to build the project. |
| `outputDir` | string | Directory where build output is placed. |
| `devCommand` | string | Command for local development. |
| `tags` | string[] | Categories for filtering. |
| `visibility` | string | `public` or `private`. |
| `enabled` | boolean | Whether to include in the global build. |

### Supported Types
- `plain-html`
- `vite` (covers React, Vue, Svelte, etc. via Vite)
- `next-static`
- `astro`
- `nuxt-static`
- `custom`

## Directory Structure
- Projects live in `projects/<slug>`.
- Avoid nested project folders.
- Use `_templates/` only for project templates.

## Dependencies
- Use `pnpm` workspace features for shared dependencies if applicable.
- Most projects should keep their dependencies in their own `package.json`.
