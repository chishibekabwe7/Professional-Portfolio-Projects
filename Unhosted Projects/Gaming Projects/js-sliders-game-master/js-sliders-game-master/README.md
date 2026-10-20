# Sliders Game

### How to Play Sliders 👉

- Choose the game size: 3x3, 4x4 etc...
- Slide pieces into the empty space from above, below or the side
- Position numbers in the correct order in the fewest possible moves
- Pieces turn green in the correct position
- When you've completed the game, add your score to the Leader Board
- See demo above ⬆

### Features 💡

- Made with Vanilla JavaScript and CSS only
- Mobile friendly and fully responsive
- Leader board scores saved to database using MongoDB Atlas - [view the Node API](https://github.com/rolandjlevy/node-api-serverless) which uses Vercel's serverless functions
- Uses DOMPurify to sanitize input. [DOMPurify](https://www.npmjs.com/package/dompurify) is a DOM-only sanitizer to protect against Cross-Site Scripting (XSS) attacks
- Includes Help section and initializing sequence to randomize game

### Running locally with Vercel CLI

The upstream Vercel API (`node-api-serverless.vercel.app`) only accepts requests from `https://js-sliders-game.vercel.app`. Running locally with `vercel dev` handles this transparently — the serverless functions in the `api/` folder proxy requests server-side, injecting the correct `Origin` and `Authorization` headers before forwarding to the upstream API.

This gives you a close-to-production environment, with static files served from the project root and `/api/*` routes handled by the same serverless functions used in production.

**1. Install dependencies (once)**

```bash
npm install
```

This includes the Vercel CLI as a dev dependency — no global install required.

**2. Link this project to your Vercel project (once)**

```bash
vercel link
```

Follow the prompts to connect to the `js-sliders-game` project on your Vercel account.

**3. Pull environment variables**

```bash
vercel env pull
```

This writes `GAME_SECRET`, `API_KEY`, and `API_BASE_URL` to a `.env.local` file in the project root (already listed in `.gitignore`, so it will never be committed).

**4. Start the dev server**

```bash
npm run vercel-dev
```

Then open the Forwarded Address shown in the **PORTS** tab (port 3000), or visit [http://localhost:3000](http://localhost:3000) directly.

> `vercel dev` serves static files from the project root and routes `/api/*` requests to the serverless functions in the `api/` folder. It runs on port 3000 by default.
