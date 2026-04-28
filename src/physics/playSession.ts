import type { BrickDef, BrickInstance } from "../bricks/types";
import { handleBrickHit } from "../bricks/resolver";
import {
  BALL_R,
  BASE_BALL_SPEED,
  CANVAS_H,
  CANVAS_W,
  GRID_COLS,
  GRID_ROWS,
  PADDLE_H,
  PADDLE_W,
  PADDLE_Y,
} from "./constants";
import { brickRect, circleRectResolve, clamp } from "./collide";
import {
  applyBrickHitFeel,
  applyLaunchFeel,
  applyPaddleFeel,
  applyWallFeel,
  updateGameFeel,
} from "./gameFeel";
import type { PlayCallbacks, PlaySession } from "./playTypes";

export type { PlayCallbacks, PlaySession } from "./playTypes";

function getDef(defs: Map<string, BrickDef>, id: string): BrickDef {
  const d = defs.get(id);
  if (!d) throw new Error(`Unknown brick def: ${id}`);
  return d;
}

export function layoutToBricks(layout: (string | null)[][]): BrickInstance[] {
  const bricks: BrickInstance[] = [];
  for (let gy = 0; gy < GRID_ROWS; gy++) {
    for (let gx = 0; gx < GRID_COLS; gx++) {
      const id = layout[gy]?.[gx] ?? null;
      if (!id) continue;
      bricks.push({
        defId: id,
        hp: 0,
        maxHp: 0,
        gx,
        gy,
        gw: 1,
        gh: 1,
      });
    }
  }
  return bricks;
}

export function hydrateBrickHp(bricks: BrickInstance[], defs: Map<string, BrickDef>): void {
  for (const b of bricks) {
    const d = getDef(defs, b.defId);
    b.maxHp = d.maxHp;
    b.hp = d.maxHp;
  }
}

export function createPlaySession(layout: (string | null)[][], defs: Map<string, BrickDef>): PlaySession {
  const bricks = layoutToBricks(layout);
  hydrateBrickHp(bricks, defs);
  const paddleX = CANVAS_W / 2;
  const ball = { x: paddleX, y: PADDLE_Y - BALL_R - 2 };
  const vel = { x: 0, y: 0 };
  return {
    bricks,
    ball,
    vel,
    paddleX,
    ballSpeedMul: 1,
    ballLaunched: false,
    launchTimer: 0.35,
    screenShake: 0,
    brickFeel: new WeakMap(),
  };
}

/** After losing a life: keep brick damage/layout state, only reset ball + serve. */
export function respawnBallKeepBricks(session: PlaySession): void {
  session.ballSpeedMul = 1;
  session.screenShake = 0;
  session.brickFeel = new WeakMap();
  session.vel.x = 0;
  session.vel.y = 0;
  session.ballLaunched = false;
  session.launchTimer = 0.35;
  session.ball.x = session.paddleX;
  session.ball.y = PADDLE_Y - BALL_R - 2;
}

export function launchBall(session: PlaySession, aimX: number): void {
  if (session.ballLaunched) return;
  const dx = clamp(aimX - session.ball.x, -120, 120);
  const len = Math.hypot(dx, -1);
  const nx = dx / len;
  const ny = -1 / len;
  const sp = BASE_BALL_SPEED * session.ballSpeedMul;
  session.vel.x = nx * sp;
  session.vel.y = ny * sp;
  session.ballLaunched = true;
  applyLaunchFeel(session);
}

function paddleReflect(session: PlaySession): void {
  const px = session.paddleX;
  const py = PADDLE_Y;
  const bx = session.ball.x;
  const by = session.ball.y;
  const hitY = by + BALL_R >= py && by - BALL_R <= py + PADDLE_H;
  const hitX = bx + BALL_R >= px - PADDLE_W / 2 && bx - BALL_R <= px + PADDLE_W / 2;
  if (!hitX || !hitY) return;

  session.ball.y = py - BALL_R - 0.01;
  const t = clamp((bx - px) / (PADDLE_W / 2), -1, 1);
  const maxAngle = (65 * Math.PI) / 180;
  const angle = t * maxAngle;
  const sp = Math.hypot(session.vel.x, session.vel.y);
  const s = Math.max(sp, BASE_BALL_SPEED * 0.85 * session.ballSpeedMul);
  session.vel.x = Math.sin(angle) * s;
  session.vel.y = -Math.cos(angle) * s;
  applyPaddleFeel(session, session.vel.x, session.vel.y);
}

export function updatePlay(
  session: PlaySession,
  defs: Map<string, BrickDef>,
  callbacks: PlayCallbacks,
  dt: number,
  pointerX: number | null,
  autoLaunch: boolean,
): "playing" | "cleared" | "lost" {
  const { ball, vel } = session;

  if (!session.ballLaunched) {
    session.paddleX = pointerX ?? session.paddleX;
    session.ball.x = session.paddleX;
    session.ball.y = PADDLE_Y - BALL_R - 2;
    session.launchTimer -= dt;
    if (autoLaunch && session.launchTimer <= 0) {
      launchBall(session, session.paddleX + (Math.sin(performance.now() / 120) * 40));
    }
    return "playing";
  }

  session.paddleX = pointerX ?? session.paddleX;

  ball.x += vel.x * dt;
  ball.y += vel.y * dt;

  if (ball.x < BALL_R) {
    ball.x = BALL_R;
    vel.x *= -1;
    applyWallFeel(session, vel.x, vel.y);
  } else if (ball.x > CANVAS_W - BALL_R) {
    ball.x = CANVAS_W - BALL_R;
    vel.x *= -1;
    applyWallFeel(session, vel.x, vel.y);
  }
  if (ball.y < BALL_R) {
    ball.y = BALL_R;
    vel.y *= -1;
    applyWallFeel(session, vel.x, vel.y);
  }

  paddleReflect(session);

  for (const brick of session.bricks) {
    const r = brickRect(brick);
    const hit = circleRectResolve(ball.x, ball.y, BALL_R, r.x, r.y, r.w, r.h);
    if (!hit) continue;

    ball.x += hit.nx * hit.pen;
    ball.y += hit.ny * hit.pen;

    if (hit.hitX) vel.x *= -1;
    else vel.y *= -1;

    applyBrickHitFeel(session, brick, ball.x, ball.y, vel.x, vel.y);
    handleBrickHit(brick, session, session.bricks, defs, callbacks, BASE_BALL_SPEED);
    break;
  }

  updateGameFeel(session, dt);

  if (ball.y - BALL_R > CANVAS_H) return "lost";
  if (session.bricks.length === 0) return "cleared";
  return "playing";
}
