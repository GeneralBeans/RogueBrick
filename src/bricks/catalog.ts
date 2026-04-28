import brickJson from "../data/bricks.json";
import { parseBrickCatalog } from "./schema";
import type { BrickDef } from "./types";

export function loadBrickCatalog(): { defs: BrickDef[]; byId: Map<string, BrickDef> } {
  const defs = parseBrickCatalog(brickJson) as BrickDef[];
  return { defs, byId: new Map(defs.map((d) => [d.id, d])) };
}
