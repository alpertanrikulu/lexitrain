import { motion } from "framer-motion";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { memo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AnsweredWord } from "@/types";
import { cn } from "@/lib/cn";

interface Props {
  answers: AnsweredWord[];
}

function ResultPanelInner({ answers }: Props) {
  if (answers.length === 0) return null;

  return (
    <div className="grid gap-3">
      {answers.map((a, i) => {
        const correct = a.outcome === "correct";
        const skipped = a.outcome === "skipped";
        const dashedSkip = a.selectedMeaning === "--";
        const isQuestion = Array.isArray(a.word.choices) && a.word.choices.length > 0;
        const Icon = correct ? CheckCircle2 : skipped ? MinusCircle : XCircle;
        const pickedLine = !correct && (
          <p className="mt-1 text-xs text-muted-foreground">
            {dashedSkip ? (
              <span className="font-mono text-muted-foreground/60">-- (skipped)</span>
            ) : (
              <>
                You picked: <span className="text-foreground">{a.selectedMeaning}</span>
              </>
            )}
          </p>
        );
        return (
          <motion.div
            key={a.word.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.25, ease: [0.2, 0.6, 0.2, 1] }}
          >
            <Card
              className={cn(
                "border-l-4 p-4",
                correct
                  ? "border-l-success/70 bg-success/5"
                  : "border-l-destructive/70 bg-destructive/5",
              )}
            >
              {isQuestion ? (
                <>
                  <div className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        correct ? "text-success" : "text-destructive",
                      )}
                    />
                    <Badge variant={correct ? "success" : "destructive"}>
                      {correct ? "correct" : skipped ? "skipped" : "wrong"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-relaxed">{a.word.word}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Answer:{" "}
                    <span className="font-medium text-foreground">{a.word.meaning}</span>
                  </p>
                  {pickedLine}
                  {a.word.explanation && (
                    <div className="mt-2 rounded-md bg-secondary/40 px-3 py-2">
                      <p className="text-sm leading-relaxed">{a.word.explanation}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          correct ? "text-success" : "text-destructive",
                        )}
                      />
                      <p className="text-sm font-semibold tracking-tight">{a.word.word}</p>
                      <Badge variant={correct ? "success" : "destructive"}>
                        {correct ? "correct" : skipped ? "skipped" : "wrong"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Answer:{" "}
                      <span className="font-medium text-foreground">{a.word.meaning}</span>
                    </p>
                  </div>
                  {pickedLine}
                  <div className="mt-2 rounded-md bg-secondary/40 px-3 py-2">
                    <p className="text-sm italic">"{a.word.example}"</p>
                    <p className="text-xs text-muted-foreground">
                      {a.word.exampleTranslation}
                    </p>
                  </div>
                </>
              )}
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

export const ResultPanel = memo(ResultPanelInner);
