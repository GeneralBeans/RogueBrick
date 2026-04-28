import type { BrickDef } from "../bricks/types";

export type RowBlueprint = (string | null)[];

export type Phase = "draft" | "rows" | "play" | "gameover";

export type RunState = {
  seed: number;
  wave: number;
  gold: number;
  lives: number;
  ownedBrickIds: string[];
  phase: Phase;
  draftOptions: BrickDef[];
  layout: (string | null)[][];
  /** Row-draft picks remaining this intermission */
  rowPicksRemaining: number;
  /** Four candidate rows for the current offer */
  rowOffers: RowBlueprint[];
  /** Mixed into RNG when refreshing offers */
  rowOfferSalt: number;
};
