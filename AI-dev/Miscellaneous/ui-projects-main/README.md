# UI Projects Monorepo

A production-ready monorepo for hosting multiple independent static demo projects via GitHub Pages.

## 🚀 Quick Start

1. **Prerequisites**
   - Node.js 20+
   - pnpm 8+

2. **Setup**
   ```bash
   pnpm install
   ```

3. **Build everything**
   ```bash
   pnpm build:pages
   ```

4. **Local Preview**
   After building, the `site/` directory contains the full static site. Use any static server:
   ```bash
   npx serve site
   ```

## 📂 Structure

- `projects/`: Individual demo projects.
- `scripts/`: Build orchestration and utility scripts.
- `docs/`: Detailed documentation.
- `site/`: Final build output (generated).

## 🛠 Adding a Project

To add a new project, you can use the templates in `projects/_templates/`.

1. Copy a template to `projects/<your-project-slug>`.
2. Update `project.config.json` with your project details.
3. Run `pnpm build:pages` to verify.

## 📖 Documentation

- [Getting Started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [Adding Projects](docs/adding-projects.md)
- [Deployment](docs/deployment.md)
- [Conventions](docs/conventions.md)

## 📄 License

MIT
