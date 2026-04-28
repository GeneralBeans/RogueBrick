import type { BrickInstance } from "../bricks/types";

export type PlayCallbacks = {
  onGold: (n: number) => void;
};

export type PlaySession = {
  bricks: BrickInstance[];
  ball: { x: number; y: number };
  vel: { x: number; y: number };
  paddleX: number;
  ballSpeedMul: number;
  ballLaunched: boolean;
  launchTimer: number;
};
