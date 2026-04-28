import type { BrickInstance } from "../bricks/types";

export type PlayCallbacks = {
  onGold: (n: number) => void;
};

/** Spring state for brick juicing (visual only; collision still uses the grid). */
export type BrickFeel = { ox: number; oy: number; vx: number; vy: number };
export type BallTrailPoint = { x: number; y: number; life: number };

export type PlaySession = {
  bricks: BrickInstance[];
  ball: { x: number; y: number };
  vel: { x: number; y: number };
  paddleX: number;
  ballSpeedMul: number;
  ballLaunched: boolean;
  launchTimer: number;
  /** Decaying camera shake magnitude (px). */
  screenShake: number;
  /** Runtime juicing; entries disappear when bricks are GC'd. */
  brickFeel: WeakMap<BrickInstance, BrickFeel>;
  /** Render-only trail samples for motion readability. */
  trail: BallTrailPoint[];
  /** Short-lived impact pulse used for ball squash/stretch. */
  ballImpactPulse: number;
};
