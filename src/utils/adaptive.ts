import type { AnswerOutcome, VocabularyWord, WordStats } from "@/types";
import { pickN, shuffle, weightedSample } from "./rng";

/**
 * Adaptive repetition engine — recurrence-rate model.
 *
 * Every word carries a recurrence rate (0..1) derived from its answer history:
 *   - A wrong/skipped answer sets the rate to 1.0. Such words are *force-
 *     included* in the very next batch (guaranteed reappearance).
 *   - Each subsequent correct recall lowers the rate by 20%:
 *       wrong → 100% (forced) → 80% → 60% → 40% → 20% → 0% (settled)
 *   - At rate 0 a word stops competing for review slots; new/unseen words are
 *     introduced instead so the learner keeps progressing through the pack.
 *
 * Rates live in each word's WordStats inside the active session, which is
 * persisted, so they survive reloads and are recomputed every batch.
 */

const BATCH_SIZE = 5;

/** Each correct recall lowers a word's recurrence rate by this much. */
const RECURRENCE_STEP = 0.2;
/** Sampling weight for never-seen words — keeps new vocabulary flowing in. */
const UNSEEN_FILL_WEIGHT = 10;
/** Sampling weight for settled words eligible only for occasional review. */
const SEEN_FILL_WEIGHT = 1;
/** Multiplier applied to a non-due word that appeared in the previous batch. */
const PREV_BATCH_PENALTY = 0.2;

/**
 * Probability (0..1) that a word should reappear in the next batch. Words that
 * have never been missed return 0; missed words start at 1.0 and step down 20%
 * per consecutive correct recall.
 */
export function recurrenceRate(stats: WordStats): number {
  if (stats.wrongCount === 0) return 0;
  return Math.max(0, 1 - RECURRENCE_STEP * stats.correctStreak);
}

export function createInitialStats(wordId: string): WordStats {
  return {
    wordId,
    wrongCount: 0,
    correctStreak: 0,
    masteryLevel: 0,
    repetitionWeight: 0,
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
      const next: WordStats = {
        ...stats,
        correctStreak: stats.correctStreak + 1,
        masteryLevel: clamp01(stats.masteryLevel + (1 - stats.masteryLevel) * 0.35),
        lastSeenBatch: batchCount,
        hasBeenCorrect: true,
      };
      return { ...next, repetitionWeight: recurrenceRate(next) };
    }
    // "--" (skipped) and wrong both count as missed for the adaptive engine:
    // the word jumps back to a 100% recurrence rate and is forced next batch.
    case "wrong":
    case "skipped": {
      const next: WordStats = {
        ...stats,
        wrongCount: stats.wrongCount + 1,
        correctStreak: 0,
        masteryLevel: clamp01(stats.masteryLevel * 0.55),
        lastSeenBatch: batchCount,
      };
      return { ...next, repetitionWeight: recurrenceRate(next) };
    }
  }
}

/**
 * Pick the next batch of `batchSize` words.
 *
 * Selection priority:
 *   1. Force-include every word answered wrong in the immediately previous
 *      batch (recurrence rate 1.0) — these are guaranteed to reappear.
 *   2. Include partially-recovered words (rate 0.8 → 0.2) each with an
 *      independent probability equal to their current recurrence rate.
 *   3. Fill remaining slots with new/unseen words (weighted up) and the odd
 *      settled word for light review, avoiding immediate back-to-back repeats.
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

  const prevBatch = currentBatch - 1;

  if (fullyLearned) {
    // Uniform 1/N drill mode — avoid the immediately previous batch.
    const eligible = words.filter((w) => {
      const s = stats[w.id];
      return !s || s.lastSeenBatch !== prevBatch;
    });
    const pool = eligible.length >= batchSize ? eligible : [...words];
    return pickN(pool, Math.min(batchSize, pool.length), rand);
  }

  const target = Math.min(batchSize, words.length);
  const selected: VocabularyWord[] = [];
  const chosen = new Set<string>();

  const add = (w: VocabularyWord) => {
    if (chosen.has(w.id)) return;
    selected.push(w);
    chosen.add(w.id);
  };

  // 1. Mandatory: words missed in the immediately previous batch (rate 1.0).
  const forced = words.filter((w) => {
    const s = stats[w.id];
    return s && s.wrongCount > 0 && s.correctStreak === 0 && s.lastSeenBatch === prevBatch;
  });
  for (const w of shuffle(forced, rand)) {
    if (selected.length >= target) break;
    add(w);
  }

  // 2. Probabilistic recurrence: each partially-recovered word (rate in
  //    (0, 1)) is included independently with probability = its rate.
  if (selected.length < target) {
    const recurring = shuffle(
      words.filter((w) => {
        if (chosen.has(w.id)) return false;
        const s = stats[w.id];
        const rate = s ? recurrenceRate(s) : 0;
        return rate > 0 && rate < 1;
      }),
      rand,
    );
    for (const w of recurring) {
      if (selected.length >= target) break;
      if (rand() < recurrenceRate(stats[w.id])) add(w);
    }
  }

  // 3. Fill the rest with new words (and occasionally a settled one).
  if (selected.length < target) {
    const cands: VocabularyWord[] = [];
    const weights: number[] = [];
    for (const w of words) {
      if (chosen.has(w.id)) continue;
      const s = stats[w.id];
      if (s && recurrenceRate(s) > 0) continue; // recurrence words had their turn
      const unseen = !s || (s.lastSeenBatch === 0 && s.wrongCount === 0 && !s.hasBeenCorrect);
      let weight = unseen ? UNSEEN_FILL_WEIGHT : SEEN_FILL_WEIGHT;
      if (s && s.lastSeenBatch === prevBatch) weight *= PREV_BATCH_PENALTY;
      cands.push(w);
      weights.push(weight);
    }
    const need = target - selected.length;
    for (const w of weightedSample(cands, weights, Math.min(need, cands.length), rand)) {
      add(w);
    }
  }

  // 4. Safety net for tiny packs: top up with anything still unused.
  if (selected.length < target) {
    for (const w of shuffle(words, rand)) {
      if (selected.length >= target) break;
      add(w);
    }
  }

  return shuffle(selected, rand);
}

/**
 * Build the multiple-choice options, shuffled.
 *
 * When the item carries a fixed `choices` array (e.g. KPSS questions) those
 * are used verbatim. Otherwise 4 distractor meanings are sampled from peer
 * words and combined with the correct meaning, de-duplicated so all options
 * are distinct.
 */
export function buildOptions(
  correct: VocabularyWord,
  pool: readonly VocabularyWord[],
  rand: () => number = Math.random,
  count = 4,
): string[] {
  if (correct.choices && correct.choices.length > 0) {
    return shuffle(correct.choices, rand);
  }
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
