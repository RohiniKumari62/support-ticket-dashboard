/**
 * Mulberry32 seeded pseudo-random number generator.
 * Produces deterministic floats in [0, 1) given an integer seed.
 */
export function createRng(seed: number = 1337): () => number {
  let s = seed >>> 0;
  return function mulberry32(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
