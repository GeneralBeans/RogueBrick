# Roguelite Brickbreaker (web prototype)

**Vite + TypeScript + Canvas2D** prototype aligned with the row-draft roguelite loop: **type draft → row offers → Breakout wave**, with **Zod-validated** brick data, **seeded** RNG, **fixed-timestep** physics, and **localStorage** run persistence.

## Run locally

```bash
cd roguelite-brickbreaker
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Host on GitHub Pages

1. Create a **new repository** on GitHub and push this project so **`package.json` is at the repo root** (the contents of this folder, not its parent).
2. In the repo on GitHub: **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions** (not “Deploy from a branch”).
4. Push to **`main`** or **`master`**. The workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) will build with `VITE_BASE=/<repository-name>/` and publish `dist`.
5. After the workflow finishes, your game will be at:

   `https://<your-username>.github.io/<repository-name>/`

**Local production check** (same base as GitHub):

```bash
# Windows PowerShell
$env:VITE_BASE="/your-repo-name/"; npm run build; npx vite preview
```

Use your real repo name instead of `your-repo-name` (leading and trailing slashes as shown).

## Controls

- **Type draft**: pick one of three brick types (unlocks it if new).
- **Row draft**: pick one of four offered **full rows** to stack onto the next free row from the top (some offers may tease types you do not own yet—placing that row unlocks them).
- **Begin wave**: start once you have at least one brick placed (you can start early even if picks remain).
- **Play**: move the mouse to steer the paddle; click to launch the ball.

## Project layout

- [`src/data/bricks.json`](src/data/bricks.json) — brick content
- [`src/bricks/schema.ts`](src/bricks/schema.ts) — Zod schema + parsing
- [`src/bricks/resolver.ts`](src/bricks/resolver.ts) — on-hit / on-destroy effect resolution
- [`src/physics/playSession.ts`](src/physics/playSession.ts) — ball + paddle + collisions
- [`src/run/rowOffers.ts`](src/run/rowOffers.ts) — row blueprint generation + placement helpers
- [`src/run/persist.ts`](src/run/persist.ts) — `localStorage` save/load
- [`src/ui/intermission.ts`](src/ui/intermission.ts) — DOM for draft / row UI
