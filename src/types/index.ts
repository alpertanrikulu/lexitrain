export type CEFRLevel = "a1" | "a2" | "b1" | "b2" | "c1" | "c2" | "pv";

export interface VocabularyWord {
  /** Stable ID: e.g. `a1_001` */
  id: string;
  word: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  /** 1–5 — increases with CEFR level */
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface PackManifestEntry {
  id: string;
  level: CEFRLevel;
  title: string;
  subtitle: string;
  size: number;
  /** Dynamic loader for the JSON payload. */
  load: () => Promise<VocabularyWord[]>;
}

export interface PackGroup {
  level: CEFRLevel;
  label: string;
  description: string;
  packs: PackManifestEntry[];
}

/** Per-word adaptive state inside the active session. */
export interface WordStats {
  wordId: string;
  wrongCount: number;
  /** Consecutive correct answers since the last wrong/skipped answer. */
  correctStreak: number;
  /** 0 (unseen) → 1 (mastered). */
  masteryLevel: number;
  /** Sampling weight — decreases with repeated correct recalls. */
  repetitionWeight: number;
  /** Batch index when this word was last presented. */
  lastSeenBatch: number;
  /** Has been answered correctly at least once (used to detect drill mode). */
  hasBeenCorrect: boolean;
}

export type AnswerOutcome = "correct" | "wrong" | "skipped";

export interface AnsweredWord {
  word: VocabularyWord;
  outcome: AnswerOutcome;
  /** User's selected meaning (null for skip). "--" means the skip option was chosen. */
  selectedMeaning: string | null;
  /** Correct meaning for convenience. */
  correctMeaning: string;
  /** Distractors shown alongside the correct meaning (excludes "--"). */
  options: string[];
}

export interface SessionStats {
  correct: number;
  wrong: number;
  skipped: number;
  /** Current consecutive correct streak inside the session. */
  streak: number;
  /** Best streak seen this session. */
  bestStreak: number;
  /** Number of distinct words answered correctly at least once. */
  learned: number;
}

export type SessionPhase = "idle" | "study" | "results" | "complete";

export interface ActiveSession {
  packId: string;
  startedAt: number;
  /** Ms of timer remaining when last tick fired, used for hydration after reload. */
  timeRemainingMs: number;
  /** Has the session naturally ended (timer or manual finish)? */
  ended: boolean;
  /** Did the user already reach 100% (every word answered correctly once)? */
  fullyLearned: boolean;
  phase: SessionPhase;
  /** Current 5-word batch (or fewer at session tail). */
  currentBatch: VocabularyWord[];
  /** Answers submitted for the current batch. */
  currentAnswers: AnsweredWord[];
  stats: SessionStats;
  /** Map of wordId → WordStats for this pack/session. */
  wordStats: Record<string, WordStats>;
  /** Cached order of wordIds within the pack for distractor sampling. */
  wordIds: string[];
  /** Monotonically increasing counter — used to avoid same-batch repeats. */
  batchCount: number;
}
