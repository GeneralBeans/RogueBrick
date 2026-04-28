import type { BrickInstance } from "../bricks/types";
import type { RunState } from "./types";

export function emptyLayout(rows: number, cols: number): (string | null)[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
}

export function createRun(seed: number, rows: number, cols: number): RunState {
  return {
    seed: seed >>> 0,
    wave: 1,
    gold: 0,
    lives: 3,
    ownedBrickIds: ["plain", "stone", "volatile"],
    phase: "draft",
    draftOptions: [],
    layout: emptyLayout(rows, cols),
    rowPicksRemaining: 0,
    rowOffers: [],
    rowOfferSalt: 0,
  };
}

export function cloneLayout(src: (string | null)[][]): (string | null)[][] {
  return src.map((row) => [...row]);
}

/** Snapshot grid ids from live bricks (HP is not stored here — gameplay uses `BrickInstance`). */
export function layoutFromBrickInstances(
  bricks: readonly BrickInstance[],
  rows: number,
  cols: number,
): (string | null)[][] {
  const layout = emptyLayout(rows, cols);
  for (const b of bricks) {
    layout[b.gy]![b.gx] = b.defId;
  }
  return layout;
}

export function countPlaced(layout: (string | null)[][]): number {
  let n = 0;
  for (const row of layout) for (const c of row) if (c) n++;
  return n;
}

export function firstEmptyRowIndex(layout: (string | null)[][]): number | null {
  for (let gy = 0; gy < layout.length; gy++) {
    const row = layout[gy]!;
    if (row.every((c) => c === null)) return gy;
  }
  return null;
}
