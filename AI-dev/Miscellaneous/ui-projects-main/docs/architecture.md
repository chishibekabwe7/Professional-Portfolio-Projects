# Architecture

This monorepo is designed to host multiple independent web projects and publish them as subpaths on GitHub Pages.

## Core Concepts

### Project Independence
Each project in the `projects/` directory is a self-contained unit with its own `package.json` (if applicable) and `project.config.json`. This allows for different frameworks and build systems to coexist.

### Centralized Orchestration
A set of scripts in the `scripts/` directory manages the discovery, validation, and building of all projects.

### Unified Output
The build system collects all project outputs into a single `site/` directory:
- `site/index.html`: The main portal page.
- `site/<slug>/`: Each individual project's assets.

## Build Flow

1. **Discovery**: `discover-projects.mjs` scans the `projects/` directory for `project.config.json` files.
2. **Validation**: `validate-projects.mjs` ensures all configurations meet the schema and there are no slug collisions.
3. **Execution**: `build-project.mjs` invokes the appropriate adapter/builder for each project type.
4. **Indexing**: `generate-index.mjs` creates the root landing page linking to all projects.

## Adapters

Adapters handle the specifics of each framework:
- **plain-html**: Simple file copy.
- **vite**: Sets the `base` configuration for the subpath.
- **next-static**: Configures `next.config.js` for static export and base path.
- **astro**: Sets `base` in `astro.config.mjs`.
- **nuxt-static**: Sets `baseURL` in `nuxt.config.ts`.
- **custom**: Runs a user-defined build command.

## Base Paths

GitHub Pages hosts the site at `https://<user>.github.io/<REPO_NAME>/`.
Sub-projects are hosted at `https://<user>.github.io/<REPO_NAME>/<slug>/`.
The build scripts automatically pass the correct base path to each framework's build command.
