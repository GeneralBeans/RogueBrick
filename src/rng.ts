/** Deterministic PRNG (mulberry32) for drafts and minor variance. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickMany<T>(rng: () => number, items: T[], count: number): T[] {
  const copy = [...items];
  const out: T[] = [];
  while (out.length < count && copy.length) {
    const i = Math.floor(rng() * copy.length);
    out.push(copy.splice(i, 1)[0]!);
  }
  return out;
}
