import type { AnswerOutcome, VocabularyWord, WordStats } from "@/types";
import { pickN, shuffle, weightedSample } from "./rng";

/**
 * Adaptive repetition engine — probability-ladder variant.
 *
 * Each word carries a `repetitionWeight`. After a wrong/skip answer the weight
 * spikes to MAX (≈80 % chance in the next 5-from-30 batch). After each
 * consecutive correct recall the weight steps down the ladder until it
 * reaches the uniform baseline (~1/N).
 *
 * Ladder (correctStreak after last wrong):
 *   0 → 20   (≈80 %)
 *   1 → 14   (≈70 %)
 *   2 →  8   (≈50 %)
 *   3 →  5   (≈40 %)
 *   4 →  3   (≈30 %)
 *   5 →  1.5 (≈20 %)
 *  ≥6 →  1.0  (uniform)
 *
 * Unseen / never-wrong words start at 8 (same level as streak-2) so fresh
 * vocabulary competes fairly with partially-learned words.
 */

const BATCH_SIZE = 5;

export const INITIAL_WEIGHT = 8;

const STREAK_WEIGHTS: ReadonlyArray<number> = [20, 14, 8, 5, 3, 1.5];
const UNIFORM_WEIGHT = 1.0;

function weightFromStreak(correctStreak: number, hasBeenWrong: boolean): number {
  if (!hasBeenWrong) return INITIAL_WEIGHT;
  if (correctStreak >= STREAK_WEIGHTS.length) return UNIFORM_WEIGHT;
  return STREAK_WEIGHTS[correctStreak];
}

export function createInitialStats(wordId: string): WordStats {
  return {
    wordId,
    wrongCount: 0,
    correctStreak: 0,
    masteryLevel: 0,
    repetitionWeight: INITIAL_WEIGHT,
    lastSeenBatch: 0,
    hasBeenCorrect: false,
  };
}

/** @param batchCount - current session batch index, stored in `lastSeenBatch`. */
export function applyOutcome(
  stats: WordStats,
  outcome: AnswerOutcome,
  batchCount = 0,
): WordStats {
  switch (outcome) {
    case "correct": {
      const correctStreak = stats.correctStreak + 1;
      const masteryLevel = clamp01(stats.masteryLevel + (1 - stats.masteryLevel) * 0.35);
      const repetitionWeight = weightFromStreak(correctStreak, stats.wrongCount > 0);
      return {
        ...stats,
        correctStreak,
        masteryLevel,
        repetitionWeight,
        lastSeenBatch: batchCount,
        hasBeenCorrect: true,
      };
    }
    // "--" (skipped) and wrong both count as wrong for the adaptive engine.
    case "wrong":
    case "skipped": {
      const wrongCount = stats.wrongCount + 1;
      const masteryLevel = clamp01(stats.masteryLevel * 0.55);
      return {
        ...stats,
        wrongCount,
        correctStreak: 0,
        masteryLevel,
        repetitionWeight: STREAK_WEIGHTS[0], // spike to maximum
        lastSeenBatch: batchCount,
      };
    }
  }
}

/**
 * Pick the next batch of `batchSize` words using weighted sampling.
 *
 * Words that appeared in the immediately previous batch (`currentBatch - 1`)
 * are penalized ×0.2 to avoid immediate repeats.
 */
export function pickNextBatch(
  words: readonly VocabularyWord[],
  stats: Record<string, WordStats>,
  currentBatch = 0,
  fullyLearned = false,
  rand: () => number = Math.random,
  batchSize = BATCH_SIZE,
): VocabularyWord[] {
  if (words.length === 0) return [];

  if (fullyLearned) {
    // Uniform 1/N drill mode — avoid the immediately previous batch.
    const prevBatch = currentBatch - 1;
    const eligible = words.filter((w) => {
      const s = stats[w.id];
      return !s || s.lastSeenBatch !== prevBatch;
    });
    const pool = eligible.length >= batchSize ? eligible : [...words];
    return pickN(pool, Math.min(batchSize, pool.length), rand);
  }

  const prevBatch = currentBatch - 1;
  const candidates: VocabularyWord[] = [];
  const weights: number[] = [];

  for (const w of words) {
    const s = stats[w.id];
    let weight = s ? s.repetitionWeight : INITIAL_WEIGHT;
    if (s && s.lastSeenBatch === prevBatch) weight *= 0.2;
    candidates.push(w);
    weights.push(weight);
  }

  const picked = weightedSample(candidates, weights, Math.min(batchSize, words.length), rand);
  return shuffle(picked, rand);
}

/**
 * Generate 4 distractor meanings + 1 correct meaning, shuffled.
 * Distractors are sampled from peer words; de-duplicated against the
 * correct meaning so all options are distinct.
 */
export function buildOptions(
  correct: VocabularyWord,
  pool: readonly VocabularyWord[],
  rand: () => number = Math.random,
  count = 4,
): string[] {
  const seen = new Set<string>([normalize(correct.meaning)]);
  const distractors: string[] = [];
  const shuffled = shuffle(pool, rand);
  for (const w of shuffled) {
    if (distractors.length >= count) break;
    if (w.id === correct.id) continue;
    const key = normalize(w.meaning);
    if (seen.has(key)) continue;
    seen.add(key);
    distractors.push(w.meaning);
  }
  return shuffle([correct.meaning, ...distractors], rand);
}

/**
 * Aggregate progress across the pack.
 * `learned` counts words that have been answered correctly at least once.
 */
export function summarizeProgress(
  words: readonly VocabularyWord[],
  stats: Record<string, WordStats>,
) {
  let learned = 0;
  let masterySum = 0;
  for (const w of words) {
    const s = stats[w.id];
    if (s?.hasBeenCorrect) learned++;
    masterySum += s?.masteryLevel ?? 0;
  }
  const total = words.length;
  return {
    learned,
    total,
    progress: total === 0 ? 0 : learned / total,
    averageMastery: total === 0 ? 0 : masterySum / total,
  };
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function normalize(s: string) {
  return s.trim().toLocaleLowerCase("en-US");
}
