export type CEFRLevel = "a1" | "a2" | "b1" | "b2" | "c1" | "c2" | "pv";

/** Top-level content category shown as a section in the sidebar. */
export type PackCategory = "vocabulary" | "kpss";

export interface VocabularyWord {
  /** Stable ID: e.g. `a1_001` */
  id: string;
  /** The prompt: a single word/phrase (vocabulary) or a full question (KPSS). */
  word: string;
  /** The correct answer. */
  meaning: string;
  example: string;
  exampleTranslation: string;
  /** 1–5 — increases with CEFR level */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /**
   * Fixed multiple-choice options. When present these are shown verbatim
   * instead of generating distractors from peer items (used by KPSS).
   */
  choices?: string[];
  /** Shown in results instead of the example sentence (used by KPSS). */
  explanation?: string;
}

export interface PackManifestEntry {
  id: string;
  category: PackCategory;
  /** Key of the sidebar group this pack belongs to (e.g. "a1", "kpss"). */
  groupId: string;
  title: string;
  subtitle: string;
  /** Item count when known ahead of time. */
  size?: number;
  /** Display unit for `size`, e.g. "words" or "questions". */
  unit?: string;
  /** Dynamic loader for the JSON payload. */
  load: () => Promise<VocabularyWord[]>;
}

export interface PackGroup {
  id: string;
  category: PackCategory;
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
