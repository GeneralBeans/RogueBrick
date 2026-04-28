import { mulberry32 } from "../rng";
import type { BrickDef } from "../bricks/types";
import { GRID_COLS } from "../physics/constants";
import type { RowBlueprint, RunState } from "./types";
import { firstEmptyRowIndex } from "./state";

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

export function rowPickBudget(wave: number, maxRows: number): number {
  return Math.min(maxRows, 4 + Math.min(6, wave + 1));
}

export function generateRowBlueprint(rng: () => number, ownedIds: readonly string[], catalog: readonly BrickDef[]): RowBlueprint {
  const row: RowBlueprint = [];
  const teasePool = catalog.map((d) => d.id).filter((id) => !ownedIds.includes(id));
  const extra = teasePool.length && rng() < 0.38 ? pick(rng, teasePool) : null;
  const teaseCol = extra !== null ? Math.floor(rng() * GRID_COLS) : -1;

  for (let c = 0; c < GRID_COLS; c++) {
    if (extra && c === teaseCol) {
      row.push(extra);
      continue;
    }
    if (rng() < 0.34) row.push(null);
    else row.push(pick(rng, ownedIds));
  }
  return row;
}

export function refillRowOffers(state: RunState, catalog: readonly BrickDef[]): void {
  const salt = (state.rowOfferSalt++ + state.wave * 977 + state.seed) >>> 0;
  const rng = mulberry32(salt);
  state.rowOffers = Array.from({ length: 4 }, () => generateRowBlueprint(rng, state.ownedBrickIds, catalog));
}

export function unlockTypesFromRow(row: RowBlueprint, state: RunState): void {
  for (const id of row) {
    if (!id) continue;
    if (!state.ownedBrickIds.includes(id)) state.ownedBrickIds.push(id);
  }
}

export function applyRowToLayout(layout: (string | null)[][], row: RowBlueprint): boolean {
  const gy = firstEmptyRowIndex(layout);
  if (gy === null) return false;
  for (let x = 0; x < GRID_COLS; x++) {
    layout[gy]![x] = row[x] ?? null;
  }
  return true;
}
