# Contributing

Thank you for contributing to the UI Projects Monorepo!

## Branch Naming
- `feat/xxx` for new features or projects
- `fix/xxx` for bug fixes
- `docs/xxx` for documentation updates
- `chore/xxx` for maintenance

## Commit Message Style
We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: add new react demo`
- `fix: correct base path in vite adapter`
- `docs: update deployment guide`

## Pull Request Process
1. Create a branch from `main`.
2. Implement your changes.
3. Ensure all projects build: `pnpm build:pages`.
4. Submit a PR with a clear description.

## PR Checklist
- [ ] Configs are valid (`pnpm validate`)
- [ ] Build succeeds locally
- [ ] Documentation updated if necessary
- [ ] Commit messages follow the standard
