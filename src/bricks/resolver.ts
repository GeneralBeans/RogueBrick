import type { BrickDef, BrickInstance } from "./types";
import type { PlayCallbacks, PlaySession } from "../physics/playTypes";
import { brickRect, clamp } from "../physics/collide";

function getDef(defs: Map<string, BrickDef>, id: string): BrickDef {
  const d = defs.get(id);
  if (!d) throw new Error(`Unknown brick def: ${id}`);
  return d;
}

function applyExplosion(
  cx: number,
  cy: number,
  radius: number,
  damage: number,
  bricks: BrickInstance[],
  queue: BrickInstance[],
  visitedDestroy: Set<BrickInstance>,
): void {
  for (const o of bricks) {
    if (visitedDestroy.has(o)) continue;
    const r = brickRect(o);
    const ocx = r.x + r.w / 2;
    const ocy = r.y + r.h / 2;
    if (Math.hypot(ocx - cx, ocy - cy) > radius) continue;
    o.hp -= damage;
    if (o.hp <= 0) {
      visitedDestroy.add(o);
      queue.push(o);
    }
  }
}

function destroyBrick(
  victim: BrickInstance,
  bricks: BrickInstance[],
  defs: Map<string, BrickDef>,
  callbacks: PlayCallbacks,
  queue: BrickInstance[],
  visitedDestroy: Set<BrickInstance>,
): void {
  const def = getDef(defs, victim.defId);

  for (const e of def.effects) {
    if (e.kind === "goldOnDestroy") callbacks.onGold(e.amount);
  }

  const r = brickRect(victim);
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;

  for (const e of def.effects) {
    if (e.kind === "explodeOnDestroy") {
      applyExplosion(cx, cy, e.radiusPx, e.damage, bricks, queue, visitedDestroy);
    }
  }

  for (const e of def.effects) {
    if (e.kind === "healNeighborsOnDestroy") {
      const neigh = [
        [victim.gx - 1, victim.gy],
        [victim.gx + 1, victim.gy],
        [victim.gx, victim.gy - 1],
        [victim.gx, victim.gy + 1],
      ] as const;
      for (const [gx, gy] of neigh) {
        const o = bricks.find((b) => b.gx === gx && b.gy === gy && !visitedDestroy.has(b));
        if (!o) continue;
        o.hp = clamp(o.hp + e.amount, 1, o.maxHp);
      }
    }
  }
}

function processDestroyQueue(
  start: BrickInstance,
  bricks: BrickInstance[],
  defs: Map<string, BrickDef>,
  callbacks: PlayCallbacks,
): void {
  const queue: BrickInstance[] = [start];
  const visited = new Set<BrickInstance>([start]);

  while (queue.length) {
    const b = queue.pop()!;
    destroyBrick(b, bricks, defs, callbacks, queue, visited);
  }

  for (let i = bricks.length - 1; i >= 0; i--) {
    if (visited.has(bricks[i]!)) bricks.splice(i, 1);
  }
}

export function handleBrickHit(
  brick: BrickInstance,
  session: PlaySession,
  bricks: BrickInstance[],
  defs: Map<string, BrickDef>,
  callbacks: PlayCallbacks,
  baseBallSpeed: number,
): void {
  const def = getDef(defs, brick.defId);
  brick.hp -= 1;

  for (const e of def.effects) {
    if (e.kind === "onHitSpeedBoost") {
      session.ballSpeedMul = Math.min(e.cap, session.ballSpeedMul + e.add);
      const sp = Math.hypot(session.vel.x, session.vel.y);
      if (sp > 1e-6) {
        const f = (baseBallSpeed * session.ballSpeedMul) / sp;
        session.vel.x *= f;
        session.vel.y *= f;
      }
    }
  }

  if (brick.hp <= 0) {
    processDestroyQueue(brick, bricks, defs, callbacks);
  }
}
