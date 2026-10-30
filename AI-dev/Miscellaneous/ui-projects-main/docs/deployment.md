# Deployment

This monorepo is configured for automatic deployment to GitHub Pages via GitHub Actions.

## Automatic Deployment

Every push to the `main` branch triggers the `pages.yml` workflow.

1. **Build**: The workflow runs `pnpm build:pages`, which builds all projects and generates the landing page.
2. **Artifact**: The contents of the `site/` directory are uploaded as a GitHub Pages artifact.
3. **Deploy**: The artifact is deployed to the repository's GitHub Pages environment.

## Manual Trigger

You can manually trigger a deployment from the "Actions" tab in your GitHub repository by selecting the "Deploy to GitHub Pages" workflow and clicking "Run workflow".

## GitHub Pages Configuration

Ensure your repository is configured to use GitHub Actions for Pages:

1. Go to **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, select **GitHub Actions**.

## Base Path Configuration

The build system automatically handles the repository name as a base path. If you rename your repository, you don't need to change any project code, as the `REPO_NAME` is dynamically determined or passed via environment variables during the build process.
