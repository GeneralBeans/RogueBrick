import type { BrickInstance } from "../bricks/types";
import { CELL, GRID_X, GRID_Y } from "./constants";

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function brickRect(b: BrickInstance) {
  const x = GRID_X + b.gx * CELL + 1;
  const y = GRID_Y + b.gy * CELL + 1;
  const w = b.gw * CELL - 2;
  const h = b.gh * CELL - 2;
  return { x, y, w, h };
}

export type CircleRectHit = { nx: number; ny: number; hitX: boolean; pen: number };

export function circleRectResolve(
  cx: number,
  cy: number,
  r: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): CircleRectHit | null {
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);
  const dx = cx - closestX;
  const dy = cy - closestY;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  const dist = Math.sqrt(Math.max(d2, 1e-8));
  const nx = dx / dist;
  const ny = dy / dist;
  const pen = r - dist;
  const hitX = Math.abs(dx) > Math.abs(dy);
  return { nx, ny, hitX, pen };
}
