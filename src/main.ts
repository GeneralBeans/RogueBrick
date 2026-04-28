import "./style.css";
import { loadBrickCatalog } from "./bricks/catalog";
import {
  CANVAS_H,
  CANVAS_W,
  FIXED_DT,
  GRID_COLS,
  GRID_ROWS,
  MAX_PHYS_STEPS,
} from "./physics/constants";
import { createPlaySession, launchBall, updatePlay, type PlaySession } from "./physics/playSession";
import { mulberry32, pickMany } from "./rng";
import { clearSavedRun, saveRun, tryLoadRun } from "./run/persist";
import { applyRowToLayout, refillRowOffers, rowPickBudget, unlockTypesFromRow } from "./run/rowOffers";
import { cloneLayout, countPlaced, createRun, emptyLayout } from "./run/state";
import type { Phase, RunState } from "./run/types";
import { drawIdleMessage, drawLayoutPreview, drawPlay } from "./ui/canvasRenderer";
import { renderIntermission } from "./ui/intermission";

const { defs: ALL_DEFS, byId: DEF_MAP } = loadBrickCatalog();

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
<div class="shell">
  <aside class="hud">
    <h1>Roguelite Brickbreaker</h1>
    <div class="muted" id="blurb">
      Seeded run + <b>row draft</b>: pick a brick type, then stack offered <b>rows</b> onto the grid.
      Synergies come from placement + brick effects (explosions, heals, gold, ball speed).
    </div>
    <div class="stat"><span>Seed</span><b id="seed">—</b></div>
    <div class="stat"><span>Wave</span><b id="wave">1</b></div>
    <div class="stat"><span>Gold</span><b id="gold">0</b></div>
    <div class="stat"><span>Lives</span><b id="lives">3</b></div>
    <div class="stat"><span>Phase</span><b id="phase">draft</b></div>
    <div id="phaseBody"></div>
    <div class="row" style="margin-top:auto">
      <button class="danger" id="newRun" type="button">New run</button>
    </div>
  </aside>
  <canvas id="c" width="${CANVAS_W}" height="${CANVAS_H}"></canvas>
</div>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#c")!;
const ctx = canvas.getContext("2d")!;
const seedEl = document.querySelector<HTMLSpanElement>("#seed")!;
const waveEl = document.querySelector<HTMLSpanElement>("#wave")!;
const goldEl = document.querySelector<HTMLSpanElement>("#gold")!;
const livesEl = document.querySelector<HTMLSpanElement>("#lives")!;
const phaseEl = document.querySelector<HTMLSpanElement>("#phase")!;
const phaseBody = document.querySelector<HTMLDivElement>("#phaseBody")!;

function freshRun(): RunState {
  return createRun((Math.random() * 2 ** 30) | 0, GRID_ROWS, GRID_COLS);
}

let state: RunState = tryLoadRun() ?? freshRun();
let playSession: PlaySession | null = null;
let waveLayout: (string | null)[][] | null = null;
let pointerCanvasX: number | null = null;
let last = performance.now();
let simAcc = 0;

function setPhase(p: Phase): void {
  state.phase = p;
}

function refillDraft(s: RunState): void {
  const rng = mulberry32((s.seed ^ (s.wave * 2654435761)) >>> 0);
  s.draftOptions = pickMany(rng, ALL_DEFS, 3);
}

function beginRowsPhase(s: RunState): void {
  s.rowPicksRemaining = rowPickBudget(s.wave, GRID_ROWS);
  refillRowOffers(s, ALL_DEFS);
  setPhase("rows");
}

function hydrateLoadedRun(): void {
  if (state.phase === "draft" && state.draftOptions.length === 0) refillDraft(state);
  if (state.phase === "rows" && state.rowOffers.length === 0) {
    state.rowPicksRemaining = Math.max(1, state.rowPicksRemaining || rowPickBudget(state.wave, GRID_ROWS));
    refillRowOffers(state, ALL_DEFS);
  }
  if (state.phase === "play" && countPlaced(state.layout) > 0) {
    playSession = createPlaySession(state.layout, DEF_MAP);
  } else {
    playSession = null;
  }
}

function renderHud(): void {
  seedEl.textContent = String(state.seed);
  waveEl.textContent = String(state.wave);
  goldEl.textContent = String(state.gold);
  livesEl.textContent = String(state.lives);
  phaseEl.textContent = state.phase;
}

function renderAll(): void {
  renderHud();
  renderIntermission(phaseBody, state, DEF_MAP, {
    onPickDraft: pickDraft,
    onPickRowOffer: pickRowOffer,
    onBeginWave: beginPlay,
  });
  saveRun(state);
}

function pickDraft(id: string): void {
  if (!state.ownedBrickIds.includes(id)) state.ownedBrickIds.push(id);
  beginRowsPhase(state);
  renderAll();
}

function pickRowOffer(index: number): void {
  const row = state.rowOffers[index];
  if (!row) return;
  const ok = applyRowToLayout(state.layout, row);
  if (!ok) return;
  unlockTypesFromRow(row, state);
  if (state.rowPicksRemaining > 0) state.rowPicksRemaining -= 1;
  if (state.rowPicksRemaining > 0) refillRowOffers(state, ALL_DEFS);
  renderAll();
}

function beginPlay(): void {
  if (countPlaced(state.layout) === 0) return;
  waveLayout = cloneLayout(state.layout);
  playSession = createPlaySession(state.layout, DEF_MAP);
  setPhase("play");
  renderAll();
}

function beginDraft(): void {
  setPhase("draft");
  refillDraft(state);
  renderAll();
}

function onWaveCleared(): void {
  state.layout = emptyLayout(GRID_ROWS, GRID_COLS);
  state.wave += 1;
  beginDraft();
}

function onRunGameOver(): void {
  playSession = null;
  waveLayout = null;
  setPhase("gameover");
  renderAll();
}

function onLifeLost(): void {
  state.lives -= 1;
  if (state.lives <= 0) {
    onRunGameOver();
    return;
  }
  if (!waveLayout) return;
  playSession = createPlaySession(waveLayout, DEF_MAP);
  renderAll();
}

function canvasToLocal(clientX: number, clientY: number): { x: number; y: number } {
  const r = canvas.getBoundingClientRect();
  const scaleX = canvas.width / r.width;
  const scaleY = canvas.height / r.height;
  return { x: (clientX - r.left) * scaleX, y: (clientY - r.top) * scaleY };
}

canvas.addEventListener("pointermove", (e) => {
  pointerCanvasX = canvasToLocal(e.clientX, e.clientY).x;
});

canvas.addEventListener("pointerdown", (e) => {
  const { x } = canvasToLocal(e.clientX, e.clientY);
  pointerCanvasX = x;
  if (state.phase === "play" && playSession && !playSession.ballLaunched) {
    launchBall(playSession, x);
  }
});

document.querySelector<HTMLButtonElement>("#newRun")!.addEventListener("click", () => {
  clearSavedRun();
  state = freshRun();
  playSession = null;
  waveLayout = null;
  simAcc = 0;
  refillDraft(state);
  renderAll();
});

hydrateLoadedRun();
renderAll();

requestAnimationFrame(function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (state.phase === "play" && playSession) {
    simAcc += dt;
    let status: ReturnType<typeof updatePlay> = "playing";
    let steps = 0;
    while (simAcc >= FIXED_DT && steps++ < MAX_PHYS_STEPS) {
      status = updatePlay(
        playSession,
        DEF_MAP,
        {
          onGold: (n) => {
            state.gold += n;
            goldEl.textContent = String(state.gold);
          },
        },
        FIXED_DT,
        pointerCanvasX,
        false,
      );
      simAcc -= FIXED_DT;
      if (status !== "playing") {
        simAcc = 0;
        break;
      }
    }

    if (status === "cleared") {
      playSession = null;
      waveLayout = null;
      onWaveCleared();
    } else if (status === "lost") {
      onLifeLost();
    }

    if (state.phase === "play" && playSession) drawPlay(ctx, playSession, DEF_MAP);
  } else if (state.phase === "rows") {
    drawLayoutPreview(ctx, state.layout, DEF_MAP, "Row draft — current layout preview");
  } else {
    drawIdleMessage(
      ctx,
      state.phase === "draft" ? "Draft in the side panel →" : "Game over — start a new run when ready",
    );
  }

  requestAnimationFrame(tick);
});
