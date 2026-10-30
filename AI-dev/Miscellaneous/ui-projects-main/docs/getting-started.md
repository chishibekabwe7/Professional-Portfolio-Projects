# Getting Started

Welcome to the UI Projects Monorepo. This guide will help you get your local environment set up and your first projects building.

## Prerequisites

- **Node.js**: Version 20 or higher is required.
- **pnpm**: Version 8 or higher is recommended.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/<REPO_NAME>.git
   cd <REPO_NAME>
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

## Development

To build the entire site and start a local preview:

1. Build all projects:
   ```bash
   pnpm build:pages
   ```

2. Start a static server:
   ```bash
   npx serve site
   ```

The landing page will be available at `http://localhost:3000/`.

## Running a Single Project

If you want to work on a specific project, you can use its individual dev command (defined in its `project.config.json`):

```bash
cd projects/my-demo
pnpm dev
```

Note: When running locally in standalone mode, the base path might differ from the final deployment.
