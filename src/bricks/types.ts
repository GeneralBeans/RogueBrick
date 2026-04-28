export type BrickEffect =
  | { kind: "explodeOnDestroy"; radiusPx: number; damage: number }
  | { kind: "onHitSpeedBoost"; add: number; cap: number }
  | { kind: "goldOnDestroy"; amount: number }
  | { kind: "healNeighborsOnDestroy"; amount: number };

export type BrickDef = {
  id: string;
  name: string;
  color: string;
  maxHp: number;
  tags: string[];
  effects: BrickEffect[];
};

export type BrickInstance = {
  defId: string;
  hp: number;
  maxHp: number;
  gx: number;
  gy: number;
  gw: number;
  gh: number;
};
