import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { discoverProjects } from './discover-projects.mjs';

export async function generateIndex(projects) {
  console.log(chalk.blue('Generating landing page...'));

  const projectCards = projects.map(p => `
    <div class="card" data-tags="${p.tags ? p.tags.join(',') : ''}">
      <h3>${p.name}</h3>
      <p>${p.description || 'No description provided.'}</p>
      <div class="tags">
        ${(p.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
      <a href="./${p.slug}/" class="button">View Demo</a>
      <div class="meta">Built: ${new Date().toLocaleString()}</div>
    </div>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UI Projects Showcase</title>
    <style>
        :root {
            --primary: #2563eb;
            --bg: #f8fafc;
            --text: #1e293b;
            --card-bg: #ffffff;
        }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: var(--bg);
            color: var(--text);
            margin: 0;
            padding: 2rem;
        }
        header {
            max-width: 1200px;
            margin: 0 auto 2rem;
            text-align: center;
        }
        h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 2rem;
            max-width: 1200px;
            margin: 0 auto;
        }
        .card {
            background: var(--card-bg);
            padding: 1.5rem;
            border-radius: 0.75rem;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            display: flex;
            flex-direction: column;
        }
        .card h3 { margin-top: 0; }
        .card p { flex-grow: 1; color: #64748b; line-height: 1.5; }
        .tags { margin-bottom: 1rem; }
        .tag {
            background: #e2e8f0;
            padding: 0.25rem 0.5rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            margin-right: 0.5rem;
        }
        .button {
            display: inline-block;
            background: var(--primary);
            color: white;
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            text-decoration: none;
            text-align: center;
            font-weight: 600;
            transition: opacity 0.2s;
        }
        .button:hover { opacity: 0.9; }
        .meta {
            margin-top: 1rem;
            font-size: 0.7rem;
            color: #94a3b8;
            text-align: right;
        }
    </style>
</head>
<body>
    <header>
        <h1>UI Projects Showcase</h1>
        <p>A collection of independent demos and experiments.</p>
    </header>
    <main class="grid">
        ${projectCards}
    </main>
</body>
</html>
  `;

  await fs.ensureDir('site');
  await fs.writeFile('site/index.html', html.trim());
  console.log(chalk.green('✓ Landing page generated at site/index.html'));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  discoverProjects().then(generateIndex);
}
