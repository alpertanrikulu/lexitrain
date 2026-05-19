/**
 * Tiny seedable PRNG (mulberry32). Keeps adaptive selection deterministic
 * across reloads when needed, while remaining fast & well-distributed.
 */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: readonly T[], rand: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickN<T>(arr: readonly T[], n: number, rand: () => number = Math.random): T[] {
  if (arr.length <= n) return shuffle(arr, rand);
  const taken = new Set<number>();
  const out: T[] = [];
  while (out.length < n) {
    const idx = Math.floor(rand() * arr.length);
    if (taken.has(idx)) continue;
    taken.add(idx);
    out.push(arr[idx]);
  }
  return out;
}

/**
 * Weighted sample without replacement using the Efraimidis-Spirakis algorithm.
 * Each candidate gets key = rand()^(1/weight); take top N by key.
 */
export function weightedSample<T>(
  items: readonly T[],
  weights: readonly number[],
  n: number,
  rand: () => number = Math.random,
): T[] {
  const len = items.length;
  if (n >= len) return shuffle(items, rand);
  const keys = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    const w = Math.max(weights[i], 1e-6);
    keys[i] = Math.pow(rand(), 1 / w);
  }
  const idx = Array.from({ length: len }, (_, i) => i).sort((a, b) => keys[b] - keys[a]);
  return idx.slice(0, n).map((i) => items[i]);
}
