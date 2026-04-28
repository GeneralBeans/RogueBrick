import type { BrickDef } from "../bricks/types";
import { shakeOffset } from "../physics/gameFeel";
import type { PlaySession } from "../physics/playTypes";
import {
  BALL_R,
  BASE_BALL_SPEED,
  CANVAS_H,
  CANVAS_W,
  CELL,
  GRID_COLS,
  GRID_ROWS,
  GRID_X,
  GRID_Y,
  PADDLE_W,
  PADDLE_Y,
} from "../physics/constants";
export function drawLayoutPreview(
  ctx: CanvasRenderingContext2D,
  layout: (string | null)[][],
  defMap: Map<string, BrickDef>,
  title: string,
): void {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "#12151c";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.strokeStyle = "#2a3140";
  for (let gy = 0; gy < GRID_ROWS; gy++) {
    for (let gx = 0; gx < GRID_COLS; gx++) {
      const x = GRID_X + gx * CELL;
      const y = GRID_Y + gy * CELL;
      ctx.strokeRect(x + 0.5, y + 0.5, CELL, CELL);
      const id = layout[gy]?.[gx] ?? null;
      if (!id) continue;
      const d = defMap.get(id)!;
      ctx.fillStyle = d.color;
      ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
      ctx.fillStyle = "#0b0d10aa";
      ctx.font = "11px system-ui";
      ctx.fillText(String(d.maxHp), x + 6, y + 14);
    }
  }

  ctx.fillStyle = "#9aa3ad";
  ctx.font = "13px system-ui";
  ctx.fillText(title, 16, 28);
}

export function drawPlay(ctx: CanvasRenderingContext2D, session: PlaySession, defMap: Map<string, BrickDef>): void {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  const { x: shakeX, y: shakeY } = shakeOffset(session);

  ctx.save();
  ctx.translate(shakeX, shakeY);

  ctx.fillStyle = "#151a24";
  ctx.fillRect(-28, -28, CANVAS_W + 56, CANVAS_H + 56);

  ctx.strokeStyle = "#2a3140";
  for (let gy = 0; gy < GRID_ROWS; gy++) {
    for (let gx = 0; gx < GRID_COLS; gx++) {
      const x = GRID_X + gx * CELL;
      const y = GRID_Y + gy * CELL;
      ctx.strokeRect(x + 0.5, y + 0.5, CELL, CELL);
    }
  }

  for (const b of session.bricks) {
    const feel = session.brickFeel.get(b);
    const ox = feel?.ox ?? 0;
    const oy = feel?.oy ?? 0;
    const x = GRID_X + b.gx * CELL + 2 + ox;
    const y = GRID_Y + b.gy * CELL + 2 + oy;
    const w = b.gw * CELL - 4;
    const h = b.gh * CELL - 4;
    const d = defMap.get(b.defId)!;
    ctx.fillStyle = d.color;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#0b0d10aa";
    ctx.fillRect(x, y + h - 8, w, 8);
    ctx.fillStyle = "#e8ecf1";
    ctx.font = "12px system-ui";
    ctx.fillText(`${b.hp}/${b.maxHp}`, x + 6, y + h - 2);
  }

  const px = session.paddleX;
  const py = PADDLE_Y;
  ctx.fillStyle = "#d7dbe6";
  ctx.fillRect(px - PADDLE_W / 2, py, PADDLE_W, 14);

  for (let i = session.trail.length - 1; i >= 0; i--) {
    const t = session.trail[i]!;
    const alpha = 0.05 + t.life * 0.18;
    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.arc(t.x, t.y, BALL_R * (0.45 + t.life * 0.45), 0, Math.PI * 2);
    ctx.fill();
  }

  const speed = Math.hypot(session.vel.x, session.vel.y);
  const speedNorm = Math.min(1.35, speed / BASE_BALL_SPEED);
  const stretchAmt = Math.min(0.72, 0.12 * speedNorm + 0.34 * session.ballImpactPulse);
  const sx = 1 + stretchAmt;
  const sy = Math.max(0.58, 1 - stretchAmt * 0.72);
  const angle = Math.atan2(session.vel.y, session.vel.x);

  ctx.save();
  ctx.translate(session.ball.x, session.ball.y);
  ctx.rotate(angle);
  ctx.scale(sx, sy);
  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(0, 0, BALL_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#9aa3ad";
  ctx.font = "13px system-ui";
  ctx.fillText(`Ball speed ×${(session.ballSpeedMul + session.rallySpeedBonus).toFixed(2)}`, 16, 28);

  ctx.restore();
}

export function drawIdleMessage(ctx: CanvasRenderingContext2D, message: string): void {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "#12151c";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "#9aa3ad";
  ctx.font = "16px system-ui";
  ctx.fillText(message, 16, 40);
}

export function describeEffects(d: BrickDef): string {
  if (!d.effects.length) return "No special effects.";
  return d.effects
    .map((e): string => {
      switch (e.kind) {
        case "explodeOnDestroy":
          return `On destroy: explosion (${e.radiusPx}px, ${e.damage} dmg)`;
        case "onHitSpeedBoost":
          return `On hit: ball speed +${e.add} (cap ${e.cap})`;
        case "goldOnDestroy":
          return `On destroy: +${e.amount} gold`;
        case "healNeighborsOnDestroy":
          return `On destroy: heal neighbors +${e.amount} HP`;
        default: {
          const _exhaustive: never = e;
          return String(_exhaustive);
        }
      }
    })
    .join(" · ");
}

export function rowPreviewHtml(row: (string | null)[], defMap: Map<string, BrickDef>): string {
  return `<div class="rowPreview" aria-hidden="true">${row
    .map((id) => {
      if (!id) return `<span class="rp rpEmpty"></span>`;
      const d = defMap.get(id);
      const color = d?.color ?? "#444";
      return `<span class="rp" style="background:${color}" title="${d?.name ?? id}"></span>`;
    })
    .join("")}</div>`;
}
