import type { BrickInstance } from "../bricks/types";
import { CELL, GRID_X, GRID_Y } from "./constants";
import type { BrickFeel, PlaySession } from "./playTypes";

const SPRING_K = 420;
const SPRING_DAMP = 32;
const MAX_OFFSET = 11;

function brickCenterPx(b: BrickInstance) {
  const x = GRID_X + b.gx * CELL + (b.gw * CELL) / 2;
  const y = GRID_Y + b.gy * CELL + (b.gh * CELL) / 2;
  return { x, y };
}

export function getBrickFeel(session: PlaySession, brick: BrickInstance): BrickFeel {
  let f = session.brickFeel.get(brick);
  if (!f) {
    f = { ox: 0, oy: 0, vx: 0, vy: 0 };
    session.brickFeel.set(brick, f);
  }
  return f;
}

function addImpulse(f: BrickFeel, ix: number, iy: number): void {
  f.vx += ix;
  f.vy += iy;
}

/** Global micro-wobble so the whole stack feels coupled. */
export function applyBrickHitFeel(
  session: PlaySession,
  struck: BrickInstance,
  ballX: number,
  ballY: number,
  velX: number,
  velY: number,
): void {
  const speed = Math.hypot(velX, velY);
  const hitCx = brickCenterPx(struck).x;
  const hitCy = brickCenterPx(struck).y;

  let dirX = hitCx - ballX;
  let dirY = hitCy - ballY;
  const dirLen = Math.hypot(dirX, dirY) || 1;
  dirX /= dirLen;
  dirY /= dirLen;

  const baseImpulse = Math.min(520, Math.max(140, speed * 0.11));

  // Direct hit — strongest kick along “push away from ball”.
  addImpulse(getBrickFeel(session, struck), dirX * baseImpulse * 1.45, dirY * baseImpulse * 1.45);

  // Nearby + global ripple: every remaining brick gets a small impulse by distance from impact.
  for (const b of session.bricks) {
    if (b === struck) continue;
    const { x: cx, y: cy } = brickCenterPx(b);
    const dx = cx - hitCx;
    const dy = cy - hitCy;
    const distCells = Math.hypot(dx, dy) / CELL;
    const falloff = 1 / (1 + distCells * distCells * 0.28);
    const nx = dx / (Math.hypot(dx, dy) || 1);
    const ny = dy / (Math.hypot(dx, dy) || 1);
    const mag = baseImpulse * 0.2 * falloff;
    addImpulse(getBrickFeel(session, b), nx * mag, ny * mag);
  }

  // Screen punch scales with impact but stays readable.
  session.screenShake = Math.min(19, session.screenShake + Math.min(11, 5.5 + speed * 0.014));
}

export function applyWallFeel(session: PlaySession, velX: number, velY: number): void {
  const speed = Math.hypot(velX, velY);
  session.screenShake = Math.min(14, session.screenShake + Math.min(4.2, 2.5 + speed * 0.006));
}

export function applyPaddleFeel(session: PlaySession, velX: number, velY: number): void {
  const speed = Math.hypot(velX, velY);
  session.screenShake = Math.min(17, session.screenShake + Math.min(7.5, 4 + speed * 0.01));
}

export function applyLaunchFeel(session: PlaySession): void {
  session.screenShake = Math.min(10, session.screenShake + 3.5);
}

/**
 * Integrate springs and decay shake. Call once per physics substep with the same `dt`.
 */
export function updateGameFeel(session: PlaySession, dt: number): void {
  session.screenShake *= Math.exp(-18 * dt);

  for (const brick of session.bricks) {
    const f = session.brickFeel.get(brick);
    if (!f) continue;

    f.vx += (-SPRING_K * f.ox - SPRING_DAMP * f.vx) * dt;
    f.vy += (-SPRING_K * f.oy - SPRING_DAMP * f.vy) * dt;
    f.ox += f.vx * dt;
    f.oy += f.vy * dt;

    f.ox = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, f.ox));
    f.oy = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, f.oy));

    const still = Math.hypot(f.ox, f.oy) < 0.06 && Math.hypot(f.vx, f.vy) < 4;
    if (still) {
      f.ox = 0;
      f.oy = 0;
      f.vx = 0;
      f.vy = 0;
      session.brickFeel.delete(brick);
    }
  }
}

/** Random shake offset for this frame (call when drawing). */
export function shakeOffset(session: PlaySession): { x: number; y: number } {
  const m = session.screenShake;
  if (m < 0.08) return { x: 0, y: 0 };
  return {
    x: (Math.random() * 2 - 1) * m,
    y: (Math.random() * 2 - 1) * m,
  };
}
