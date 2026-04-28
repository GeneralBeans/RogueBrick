import type { BrickDef } from "../bricks/types";
import type { RunState } from "../run/types";
import { countPlaced } from "../run/state";
import { describeEffects, rowPreviewHtml } from "./canvasRenderer";

export type IntermissionHandlers = {
  onPickDraft: (id: string) => void;
  onPickRowOffer: (index: number) => void;
  onBeginWave: () => void;
};

export function renderIntermission(root: HTMLElement, state: RunState, defs: Map<string, BrickDef>, h: IntermissionHandlers): void {
  root.innerHTML = "";

  if (state.phase === "draft") {
    const p = document.createElement("div");
    p.className = "muted";
    p.textContent = "Pick one brick type to add to your run pool (unlocks it if new).";
    root.appendChild(p);
    for (const d of state.draftOptions) {
      const b = document.createElement("button");
      b.className = "draft-card";
      b.type = "button";
      b.innerHTML = `<div><b>${d.name}</b> <span class="muted">(${d.maxHp} HP)</span></div>
        <div style="margin-top:6px">${d.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
        <div class="muted" style="margin-top:6px">${describeEffects(d)}</div>`;
      b.addEventListener("click", () => h.onPickDraft(d.id));
      root.appendChild(b);
    }
    return;
  }

  if (state.phase === "rows") {
    const p = document.createElement("div");
    p.className = "muted";
    p.textContent = `Row draft: choose full rows to stack from the top. Picks left: ${state.rowPicksRemaining}.`;
    root.appendChild(p);

    state.rowOffers.forEach((row, idx) => {
      const b = document.createElement("button");
      b.className = "draft-card rowOffer";
      b.type = "button";
      b.disabled = state.rowPicksRemaining <= 0;
      b.innerHTML = `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
          <div><b>Row ${idx + 1}</b> <span class="muted">(place onto next free row)</span></div>
        </div>
        ${rowPreviewHtml(row, defs)}`;
      b.addEventListener("click", () => h.onPickRowOffer(idx));
      root.appendChild(b);
    });

    const row = document.createElement("div");
    row.className = "row";
    const go = document.createElement("button");
    go.className = "primary";
    go.type = "button";
    go.textContent = "Begin wave";
    go.disabled = countPlaced(state.layout) === 0;
    go.addEventListener("click", () => h.onBeginWave());
    row.appendChild(go);
    root.appendChild(row);
    return;
  }

  if (state.phase === "play") {
    const p = document.createElement("div");
    p.className = "muted";
    p.textContent = "Move the mouse to steer. Click to launch the ball.";
    root.appendChild(p);
    return;
  }

  const p = document.createElement("div");
  p.className = "muted";
  p.textContent = "Run over. Restart to try a new seed.";
  root.appendChild(p);
}
