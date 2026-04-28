import type { BrickInstance } from "../bricks/types";
import { BASE_BALL_SPEED, CELL, GRID_X, GRID_Y } from "./constants";
import type { BrickFeel, PlaySession } from "./playTypes";

/** Shake increment scales with ball speed; extra weight when faster than baseline. */
function addSpeedScaledShake(session: PlaySession, speed: number, linearGain: number, maxBump: number, ceiling: number): void {
  const ratio = Math.max(0.35, Math.min(2.4, speed / BASE_BALL_SPEED));
  const delta = Math.min(maxBump, speed * linearGain * ratio);
  session.screenShake = Math.min(ceiling, session.screenShake + delta);
}

const SPRING_K = 420;
const SPRING_DAMP = 32;
const MAX_OFFSET = 11;

/** Strength of neighbor ripple relative to `baseImpulse` (connectivity wave). */
const RIPPLE_GAIN = 0.46;
/** Amplitude multiplier per BFS hop along touching bricks (edge-adjacent). */
const RIPPLE_PER_HOP = 0.74;

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

function brickOccupancyMap(bricks: readonly BrickInstance[]): Map<string, BrickInstance> {
  const map = new Map<string, BrickInstance>();
  for (const b of bricks) {
    map.set(`${b.gx},${b.gy}`, b);
  }
  return map;
}

/** Edge-adjacent (4-neighbor) bricks reachable from `start`. */
function connectedRippleDistances(start: BrickInstance, grid: Map<string, BrickInstance>): Map<BrickInstance, number> {
  const dist = new Map<BrickInstance, number>();
  const q: BrickInstance[] = [start];
  dist.set(start, 0);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;

  while (q.length) {
    const b = q.shift()!;
    const d = dist.get(b)!;
    for (const [dx, dy] of dirs) {
      const nb = grid.get(`${b.gx + dx},${b.gy + dy}`);
      if (!nb || dist.has(nb)) continue;
      dist.set(nb, d + 1);
      q.push(nb);
    }
  }
  return dist;
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

  // Ripple through edge-connected bricks only: outward from impact center, weaker each hop.
  const grid = brickOccupancyMap(session.bricks);
  const ripple = connectedRippleDistances(struck, grid);

  for (const [b, hops] of ripple) {
    if (hops === 0) continue;
    const { x: cx, y: cy } = brickCenterPx(b);
    let rdx = cx - hitCx;
    let rdy = cy - hitCy;
    const rlen = Math.hypot(rdx, rdy);
    if (rlen < 1e-3) continue;
    rdx /= rlen;
    rdy /= rlen;
    const hopDecay = Math.pow(RIPPLE_PER_HOP, hops);
    const mag = baseImpulse * RIPPLE_GAIN * hopDecay;
    addImpulse(getBrickFeel(session, b), rdx * mag, rdy * mag);
  }

  addSpeedScaledShake(session, speed, 0.0085, 4.8, 11);
}

export function applyWallFeel(session: PlaySession, velX: number, velY: number): void {
  const speed = Math.hypot(velX, velY);
  addSpeedScaledShake(session, speed, 0.0019, 1.35, 11);
}

export function applyPaddleFeel(session: PlaySession, velX: number, velY: number): void {
  const speed = Math.hypot(velX, velY);
  addSpeedScaledShake(session, speed, 0.0036, 3.1, 11);
}

export function applyLaunchFeel(session: PlaySession): void {
  const speed = Math.hypot(session.vel.x, session.vel.y);
  addSpeedScaledShake(session, speed, 0.0026, 2.2, 11);
}

/**
 * Integrate springs and decay shake. Call once per physics substep with the same `dt`.
 */
export function updateGameFeel(session: PlaySession, dt: number): void {
  session.screenShake *= Math.exp(-20 * dt);

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
