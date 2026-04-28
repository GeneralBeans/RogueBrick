import type { BrickInstance } from "../bricks/types";

export type PlayCallbacks = {
  onGold: (n: number) => void;
};

/** Spring state for brick juicing (visual only; collision still uses the grid). */
export type BrickFeel = { ox: number; oy: number; vx: number; vy: number };
export type BallTrailPoint = { x: number; y: number; life: number };

export type RallyPerkEffect =
  | { kind: "addSpeedBonus"; amount: number }
  | { kind: "setDamageMultiplier"; amount: number }
  | { kind: "retainRallyOnLifeLoss"; ratio: number };

export type RallyPerkDef = {
  id: string;
  name: string;
  threshold: number;
  effects: RallyPerkEffect[];
};

export type RallyPerkRuntime = RallyPerkDef & {
  triggered: boolean;
};

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
  /** Rally chain for this ball-in-play. */
  rallyCount: number;
  /** Best rally reached in the current wave. */
  maxRallyThisWave: number;
  /** Damage multiplier applied to direct ball hits on bricks. */
  damageMul: number;
  /** Rally-awarded additive speed bonus for this wave. */
  rallySpeedBonus: number;
  /** Active rally perks for this wave (data-driven from JSON). */
  rallyPerks: RallyPerkRuntime[];
  /** Portion of rally kept when losing a life. */
  rallyRetainRatio: number;
};
