import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type {
  ActiveSession,
  AnswerOutcome,
  AnsweredWord,
  SessionStats,
  VocabularyWord,
  WordStats,
} from "@/types";
import {
  applyOutcome,
  createInitialStats,
  pickNextBatch,
  summarizeProgress,
} from "@/utils/adaptive";
import { safeStorage } from "@/utils/storage";

export const SESSION_DURATION_MS = 30 * 60 * 1000;
export const BATCH_SIZE = 5;

interface SessionState {
  /** Currently active session (or null when none has been started). */
  session: ActiveSession | null;
  /** Pack words cached in memory while the session is active. Not persisted. */
  packWords: VocabularyWord[];
  /** Per-pack completion: ratio of words answered correctly at least once. */
  packProgress: Record<string, { learned: number; total: number; updatedAt: number }>;

  startSession: (packId: string, words: VocabularyWord[]) => void;
  rehydratePack: (packId: string, words: VocabularyWord[]) => void;
  answer: (
    wordId: string,
    outcome: AnswerOutcome,
    selectedMeaning: string | null,
    options: string[],
  ) => void;
  /** Transition from study → results phase (once all words in a batch are answered). */
  showResults: () => void;
  loadNextBatch: () => void;
  /** Manually finish current session (only valid once fullyLearned). */
  finishSession: () => void;
  /** Drop session entirely. */
  abandonSession: () => void;
  /** Timer tick — call every second from a single useEffect interval. */
  tick: (deltaMs: number) => void;
}

const emptyStats = (): SessionStats => ({
  correct: 0,
  wrong: 0,
  skipped: 0,
  streak: 0,
  bestStreak: 0,
  learned: 0,
});

function buildInitialWordStats(words: VocabularyWord[]): Record<string, WordStats> {
  const out: Record<string, WordStats> = {};
  for (const w of words) out[w.id] = createInitialStats(w.id);
  return out;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      session: null,
      packWords: [],
      packProgress: {},

      startSession: (packId, words) => {
        const wordStats = buildInitialWordStats(words);
        const session: ActiveSession = {
          packId,
          startedAt: Date.now(),
          timeRemainingMs: SESSION_DURATION_MS,
          ended: false,
          fullyLearned: false,
          phase: "study",
          currentBatch: [],
          currentAnswers: [],
          stats: emptyStats(),
          wordStats,
          wordIds: words.map((w) => w.id),
          batchCount: 0,
        };
        set({ session, packWords: words });
        get().loadNextBatch();
      },

      rehydratePack: (packId, words) => {
        const { session } = get();
        if (!session || session.packId !== packId) return;
        set({ packWords: words });
        if (session.currentBatch.length === 0 && session.currentAnswers.length === 0) {
          get().loadNextBatch();
        }
      },

      loadNextBatch: () => {
        const { session, packWords } = get();
        if (!session) return;
        const nextBatchCount = session.batchCount + 1;
        const batch = pickNextBatch(
          packWords,
          session.wordStats,
          nextBatchCount,
          session.fullyLearned,
        );
        set({
          session: {
            ...session,
            currentBatch: batch,
            currentAnswers: [],
            phase: "study",
            batchCount: nextBatchCount,
          },
        });
      },

      answer: (wordId, outcome, selectedMeaning, options) => {
        const { session, packWords } = get();
        if (!session) return;
        const word = session.currentBatch.find((w) => w.id === wordId);
        if (!word) return;
        if (session.currentAnswers.some((a) => a.word.id === wordId)) return;

        const prev = session.wordStats[wordId] ?? createInitialStats(wordId);
        const updatedWordStats = applyOutcome(prev, outcome, session.batchCount);

        const stats = { ...session.stats };
        if (outcome === "correct") {
          stats.correct++;
          stats.streak++;
          stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
        } else if (outcome === "wrong") {
          stats.wrong++;
          stats.streak = 0;
        } else {
          stats.skipped++;
          stats.streak = 0;
        }

        const answered: AnsweredWord = {
          word,
          outcome,
          selectedMeaning,
          correctMeaning: word.meaning,
          options,
        };

        const wordStats = { ...session.wordStats, [wordId]: updatedWordStats };
        const summary = summarizeProgress(packWords, wordStats);
        stats.learned = summary.learned;

        const fullyLearned = summary.learned >= packWords.length && packWords.length > 0;
        const nextAnswers = [...session.currentAnswers, answered];

        set({
          session: {
            ...session,
            wordStats,
            stats,
            fullyLearned: session.fullyLearned || fullyLearned,
            currentAnswers: nextAnswers,
            // Phase stays "study" — user must explicitly click "Show Results".
          },
          packProgress: {
            ...get().packProgress,
            [session.packId]: {
              learned: summary.learned,
              total: summary.total,
              updatedAt: Date.now(),
            },
          },
        });
      },

      showResults: () => {
        const { session } = get();
        if (!session) return;
        const allAnswered =
          session.currentAnswers.length === session.currentBatch.length &&
          session.currentBatch.length > 0;
        if (!allAnswered) return;
        set({ session: { ...session, phase: "results" } });
      },

      finishSession: () => {
        const { session } = get();
        if (!session) return;
        if (!session.fullyLearned && session.timeRemainingMs > 0) return;
        set({ session: { ...session, ended: true, phase: "complete" } });
      },

      abandonSession: () => {
        set({ session: null, packWords: [] });
      },

      tick: (deltaMs) => {
        const { session } = get();
        if (!session || session.ended) return;
        if (session.fullyLearned) return;
        const next = Math.max(0, session.timeRemainingMs - deltaMs);
        if (next <= 0) {
          set({
            session: { ...session, timeRemainingMs: 0, ended: true, phase: "complete" },
          });
          return;
        }
        set({ session: { ...session, timeRemainingMs: next } });
      },
    }),
    {
      name: "lexitrain.session",
      version: 3,
      storage: createJSONStorage(() => ({
        getItem: (k) => safeStorage.getItem(k),
        setItem: (k, v) => safeStorage.setItem(k, v),
        removeItem: (k) => safeStorage.removeItem(k),
      })),
      partialize: (s) => ({
        session: s.session,
        packProgress: s.packProgress,
      }),
    },
  ),
);
