export const CANVAS_W = 920;
export const CANVAS_H = 640;

export const GRID_COLS = 14;
export const GRID_ROWS = 7;
export const CELL = 44;

export const GRID_X = Math.floor((CANVAS_W - GRID_COLS * CELL) / 2);
export const GRID_Y = 72;

export const PADDLE_Y = CANVAS_H - 56;
export const PADDLE_W = 118;
export const PADDLE_H = 14;

export const BALL_R = 8;
export const BASE_BALL_SPEED = 320;

export const FIXED_DT = 1 / 120;
export const MAX_PHYS_STEPS = 10;
