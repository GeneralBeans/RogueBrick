import { z } from "zod";
import rallyPerksJson from "../data/rally-perks.json";
import type { RallyPerkDef, RallyPerkRuntime } from "../physics/playTypes";

const RallyPerkEffectSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("addSpeedBonus"), amount: z.number().nonnegative() }),
  z.object({ kind: z.literal("setDamageMultiplier"), amount: z.number().positive() }),
  z.object({ kind: z.literal("retainRallyOnLifeLoss"), ratio: z.number().min(0).max(1) }),
]);

const RallyPerkSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  threshold: z.number().int().positive(),
  effects: z.array(RallyPerkEffectSchema).min(1),
});

const RallyPerkCatalogSchema = z.array(RallyPerkSchema);

export function loadRallyPerks(): RallyPerkDef[] {
  return RallyPerkCatalogSchema.parse(rallyPerksJson) as RallyPerkDef[];
}

export function runtimeRallyPerks(defs: readonly RallyPerkDef[]): RallyPerkRuntime[] {
  return defs.map((p) => ({ ...p, triggered: false }));
}

