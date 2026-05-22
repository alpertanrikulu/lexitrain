import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buildOptions } from "@/utils/adaptive";
import type { VocabularyWord } from "@/types";
import { cn } from "@/lib/cn";

interface WordCardProps {
  word: VocabularyWord;
  pool: VocabularyWord[];
  index: number;
  total: number;
  /** True when this word has already been answered in the current batch. */
  answered: boolean;
  /** Pre-selected meaning to restore after a page reload mid-batch. */
  preselectedMeaning?: string | null;
  /** Reveal the choices without requiring a tap (used to flow to the next card). */
  autoReveal?: boolean;
  onAnswer: (
    outcome: "correct" | "wrong" | "skipped",
    selectedMeaning: string | null,
    options: string[],
  ) => void;
}

function WordCardInner({
  word,
  pool,
  index,
  total,
  answered,
  preselectedMeaning,
  autoReveal,
  onAnswer,
}: WordCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [chosen, setChosen] = useState<string | null>(preselectedMeaning ?? null);

  const options = useMemo(() => buildOptions(word, pool), [word, pool]);

  // Reset local state when the word changes.
  useEffect(() => {
    setRevealed(false);
    setChosen(preselectedMeaning ?? null);
  }, [word.id, preselectedMeaning]);

  const submit = (meaning: string | null) => {
    if (answered || chosen !== null) return;
    setChosen(meaning);
    if (meaning === null || meaning === "--") {
      onAnswer("skipped", meaning, options);
    } else {
      const correct = meaning.trim().toLowerCase() === word.meaning.trim().toLowerCase();
      onAnswer(correct ? "correct" : "wrong", meaning, options);
    }
  };

  const isLocked = answered || chosen !== null;
  const isQuestion = Array.isArray(word.choices) && word.choices.length > 0;
  const showOptions = revealed || isLocked || !!autoReveal;
  const promptHint = isLocked
    ? "Answered"
    : showOptions
      ? isQuestion
        ? "Choose the correct answer"
        : "Choose the meaning"
      : isQuestion
        ? "Tap to reveal choices"
        : "Tap to choose meaning";

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-60" />
      <div className="flex flex-col gap-5 p-5 lg:p-6">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="font-mono">
            #{(index + 1).toString().padStart(2, "0")} / {total}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <span className="text-muted-foreground">Difficulty</span>
            <span className="font-semibold">{"●".repeat(word.difficulty)}</span>
          </Badge>
        </div>

        <button
          type="button"
          onClick={() => !isLocked && setRevealed(true)}
          disabled={isLocked}
          className={cn(
            "group relative w-full select-none rounded-2xl border border-border/70 bg-gradient-to-br from-secondary/40 to-secondary/10 text-left transition-all focus-ring",
            isQuestion ? "px-5 py-5" : "px-6 py-8",
            !isLocked && "hover:from-secondary/70 hover:to-secondary/30 hover:border-primary/40",
            isLocked && "cursor-default",
          )}
          aria-label={`Reveal options for "${word.word}"`}
        >
          <p className="pr-20 text-[11px] uppercase tracking-widest text-muted-foreground">
            {promptHint}
          </p>
          <p
            className={cn(
              "mt-2 font-bold tracking-tight",
              isQuestion
                ? "text-base font-semibold leading-relaxed text-pretty sm:text-lg"
                : "text-4xl text-balance lg:text-5xl",
            )}
          >
            {word.word}
          </p>
          {!showOptions && (
            <span className="absolute right-4 top-4 flex h-7 items-center gap-1.5 rounded-full bg-primary/15 px-2.5 text-[11px] font-medium text-primary">
              <HelpCircle className="h-3 w-3" /> Reveal
            </span>
          )}
          {isLocked && (
            <span className="absolute right-4 top-4 flex h-7 items-center gap-1.5 rounded-full bg-secondary/60 px-2.5 text-[11px] font-medium text-muted-foreground">
              Answered
            </span>
          )}
        </button>

        <AnimatePresence initial={false} mode="wait">
          {showOptions && (
            <motion.div
              key="options"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0.6, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className={cn("grid gap-2", !isQuestion && "md:grid-cols-2")}>
                {options.map((opt, i) => {
                  const isChosen = chosen === opt;
                  const isDimmed = chosen !== null && !isChosen;
                  return (
                    <motion.div
                      key={opt}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <button
                        type="button"
                        onClick={() => submit(opt)}
                        disabled={isLocked && !isChosen}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl border border-border/70 bg-card/70 px-4 py-3 text-left text-sm transition-all focus-ring",
                          !isLocked && "hover:border-primary/40 hover:bg-secondary/60",
                          isChosen &&
                            "border-primary/50 bg-primary/10 ring-2 ring-inset ring-primary/30",
                          isDimmed && "opacity-40",
                        )}
                      >
                        <span className={cn(!isQuestion && "line-clamp-2")}>{opt}</span>
                      </button>
                    </motion.div>
                  );
                })}

                {/* "--" skip option — always last, visually distinct */}
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: options.length * 0.03 }}
                >
                  <button
                    type="button"
                    onClick={() => submit("--")}
                    disabled={isLocked}
                    className={cn(
                      "flex w-full items-center justify-center rounded-xl border border-dashed border-border/50 bg-transparent px-4 py-3 text-left text-sm transition-all focus-ring",
                      !isLocked && "hover:border-muted-foreground/40 hover:bg-secondary/30",
                      chosen === "--" &&
                        "border-muted-foreground/60 bg-muted/20 ring-2 ring-inset ring-muted-foreground/20",
                      chosen !== null && chosen !== "--" && "opacity-30",
                    )}
                    aria-label="Skip this word"
                  >
                    <span className="font-mono text-xs tracking-widest text-muted-foreground">
                      --
                    </span>
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

export const WordCard = memo(WordCardInner);
