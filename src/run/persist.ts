import type { Phase, RunState } from "./types";

const KEY = "rrb.run.v1";

type PersistV1 = {
  v: 1;
  state: RunState;
};

function isPhase(x: unknown): x is Phase {
  return x === "draft" || x === "rows" || x === "play" || x === "gameover";
}

export function tryLoadRun(): RunState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistV1;
    if (!data || data.v !== 1 || !data.state) return null;
    const s = data.state;
    if (typeof s.seed !== "number") return null;
    if (typeof s.wave !== "number") return null;
    if (!isPhase(s.phase)) return null;
    if (!Array.isArray(s.ownedBrickIds)) return null;
    if (!Array.isArray(s.layout)) return null;
    if (!Array.isArray(s.rowOffers)) return null;
    return s as RunState;
  } catch {
    return null;
  }
}

export function saveRun(state: RunState): void {
  const payload: PersistV1 = { v: 1, state: structuredClone(state) };
  try {
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

export function clearSavedRun(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
