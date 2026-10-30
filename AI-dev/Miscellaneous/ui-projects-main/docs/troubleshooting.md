# Troubleshooting

Common issues and their solutions.

## Build Failures

### Project Build Fails
- Check the project's own `package.json` for missing dependencies.
- Ensure the `buildCommand` in `project.config.json` is correct.
- Check logs in the CI/CD pipeline for specific error messages.

### Base Path Issues
- If assets (CSS, images) are not loading on GitHub Pages, ensure the framework is correctly using the base path.
- Vite: Check `vite.config.js` for `base` configuration.
- Next.js: Ensure `basePath` is set in `next.config.js`.

## Local Development

### Missing Dependencies
- Run `pnpm install` at the root to ensure all workspace dependencies are installed.

### Site Index Not Updating
- Run `pnpm build:pages` to regenerate the `site/index.html`.

## Framework Specifics

| Framework | Common Issue | Solution |
|-----------|--------------|----------|
| Next.js | `next export` deprecated | Use `output: 'export'` in `next.config.js` (Next 13.4+). |
| Vite | Relative paths in HTML | Ensure `base: './'` or dynamic base path is used. |
| Astro | Image optimization | Static export may require specific configuration for images. |
