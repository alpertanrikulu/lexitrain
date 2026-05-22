import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ListChecks,
  Sparkles,
  XCircle,
} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ResultPanel } from "@/features/results/ResultPanel";
import { useSessionStore } from "@/store/session";
import type { AnswerOutcome, VocabularyWord } from "@/types";

import { WordCard } from "./WordCard";

interface Props {
  words: VocabularyWord[];
}

function StudyWorkspaceInner({ words }: Props) {
  const session = useSessionStore((s) => s.session);
  const answer = useSessionStore((s) => s.answer);
  const showResults = useSessionStore((s) => s.showResults);
  const loadNextBatch = useSessionStore((s) => s.loadNextBatch);
  const finishSession = useSessionStore((s) => s.finishSession);

  const topRef = useRef<HTMLDivElement | null>(null);
  const actionBarRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [busy, setBusy] = useState(false);
  const [autoRevealIds, setAutoRevealIds] = useState<Set<string>>(new Set());

  const studyPhase = session?.phase;
  const batchCount = session?.batchCount;
  const batchWords = session?.currentBatch;
  const batchAnswers = session?.currentAnswers;

  // Reset the auto-reveal flow whenever a new batch starts.
  useEffect(() => {
    setAutoRevealIds(new Set());
  }, [batchCount]);

  // After each answer, reveal the next unanswered card and scroll it into view
  // so the learner can keep answering without manual scrolling.
  useEffect(() => {
    if (studyPhase !== "study" || !batchWords || !batchAnswers) return;
    if (batchAnswers.length === 0) return;

    const answered = new Set(batchAnswers.map((a) => a.word.id));
    const lastId = batchAnswers[batchAnswers.length - 1].word.id;
    const lastIdx = batchWords.findIndex((w) => w.id === lastId);
    const next =
      batchWords.slice(lastIdx + 1).find((w) => !answered.has(w.id)) ??
      batchWords.find((w) => !answered.has(w.id));

    if (next) {
      setAutoRevealIds((prev) =>
        prev.has(next.id) ? prev : new Set(prev).add(next.id),
      );
      requestAnimationFrame(() => {
        cardRefs.current
          .get(next.id)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      requestAnimationFrame(() => {
        actionBarRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      });
    }
  }, [batchAnswers, batchWords, studyPhase]);

  const handleAnswer = useCallback(
    (wordId: string, outcome: AnswerOutcome, selected: string | null, options: string[]) => {
      answer(wordId, outcome, selected, options);
    },
    [answer],
  );

  const handleShowResults = useCallback(() => {
    if (busy) return;
    setBusy(true);
    showResults();
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setBusy(false);
    });
  }, [busy, showResults]);

  const handleContinue = useCallback(() => {
    if (busy) return;
    setBusy(true);
    loadNextBatch();
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setBusy(false);
    });
  }, [busy, loadNextBatch]);

  if (!session || session.ended) return null;

  const { currentBatch, currentAnswers, phase, fullyLearned, timeRemainingMs } = session;

  const answeredIds = new Set(currentAnswers.map((a) => a.word.id));
  const allAnswered = currentAnswers.length === currentBatch.length && currentBatch.length > 0;

  return (
    <div ref={topRef} className="flex flex-col gap-4 scroll-mt-4">
      {/* Batch meta row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {phase === "results" ? "Results" : "Adaptive batch"}
          </Badge>
          {phase === "study" && (
            <span className="text-xs text-muted-foreground">
              {currentAnswers.length} / {currentBatch.length} answered
            </span>
          )}
        </div>
        {fullyLearned && (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Drill mode
          </Badge>
        )}
        {!fullyLearned && timeRemainingMs < 60_000 && phase === "study" && (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" /> Under a minute
          </Badge>
        )}
      </div>

      {/* Main content area — animates between study cards and results */}
      <AnimatePresence mode="wait">
        {phase === "study" && (
          <motion.div
            key={`batch-${session.batchCount}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.2, 0.6, 0.2, 1] }}
            className="grid gap-4"
          >
            {currentBatch.map((word, idx) => {
              const existingAnswer = currentAnswers.find((a) => a.word.id === word.id);
              return (
                <div
                  key={word.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(word.id, el);
                    else cardRefs.current.delete(word.id);
                  }}
                  className="scroll-mt-4"
                >
                  <WordCard
                    word={word}
                    pool={words}
                    index={idx}
                    total={currentBatch.length}
                    answered={answeredIds.has(word.id)}
                    preselectedMeaning={existingAnswer?.selectedMeaning}
                    autoReveal={autoRevealIds.has(word.id)}
                    onAnswer={(outcome, selectedMeaning, options) =>
                      handleAnswer(word.id, outcome, selectedMeaning, options)
                    }
                  />
                </div>
              );
            })}
          </motion.div>
        )}

        {phase === "results" && (
          <motion.div
            key={`results-${session.batchCount}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.2, 0.6, 0.2, 1] }}
          >
            <ResultPanel answers={currentAnswers} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action bar */}
      <Card
        ref={actionBarRef}
        className="flex flex-col items-center gap-3 p-5 lg:flex-row lg:justify-between"
      >
        <p className="text-sm text-muted-foreground">
          {phase === "results"
            ? "Review your answers, then continue to the next batch."
            : allAnswered
              ? "All words answered — ready to see results."
              : "Answer every word to unlock results."}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {phase === "study" && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleShowResults}
                disabled={!allAnswered || busy}
                className="gap-2"
              >
                <ListChecks className="h-4 w-4" />
                Show Results
              </Button>
            </motion.div>
          )}

          {phase === "results" && (
            <>
              {fullyLearned && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="success" onClick={finishSession}>
                    Finish session
                  </Button>
                </motion.div>
              )}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button onClick={handleContinue} disabled={busy} className="gap-2">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            </>
          )}

          {/* Drill-mode finish (visible at any point once fully learned) */}
          {fullyLearned && phase === "study" && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="success" onClick={finishSession} size="sm">
                <ChevronRight className="h-4 w-4" /> Finish
              </Button>
            </motion.div>
          )}
        </div>
      </Card>
    </div>
  );
}

export const StudyWorkspace = memo(StudyWorkspaceInner);
