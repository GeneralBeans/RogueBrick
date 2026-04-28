import { z } from "zod";

const BrickEffectSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("explodeOnDestroy"), radiusPx: z.number(), damage: z.number() }),
  z.object({ kind: z.literal("onHitSpeedBoost"), add: z.number(), cap: z.number() }),
  z.object({ kind: z.literal("goldOnDestroy"), amount: z.number() }),
  z.object({ kind: z.literal("healNeighborsOnDestroy"), amount: z.number() }),
]);

export const BrickDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().min(1),
  maxHp: z.number().int().positive(),
  tags: z.array(z.string()),
  effects: z.array(BrickEffectSchema),
});

export const BrickCatalogSchema = z.array(BrickDefSchema);

export type ParsedBrickDef = z.infer<typeof BrickDefSchema>;

export function parseBrickCatalog(raw: unknown): ParsedBrickDef[] {
  return BrickCatalogSchema.parse(raw);
}
