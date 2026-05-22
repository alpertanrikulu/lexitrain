import { RotateCw, Trophy, XCircle } from "lucide-react";
import { memo } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { findPack } from "@/vocabulary/manifest";
import { useSessionStore } from "@/store/session";
import { formatPercent } from "@/utils/format";

interface Props {
  onRestart: () => void;
  onReturn: () => void;
}

function SessionSummaryDialogInner({ onRestart, onReturn }: Props) {
  const session = useSessionStore((s) => s.session);
  const abandon = useSessionStore((s) => s.abandonSession);

  if (!session) return null;
  const pack = findPack(session.packId);
  const open = session.ended;
  if (!open) return null;

  const total = session.wordIds.length;
  const learned = session.stats.learned;
  const progress = total === 0 ? 0 : learned / total;
  const reachedGoal = session.fullyLearned;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onReturn()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {reachedGoal ? (
              <>
                <Trophy className="h-5 w-5 text-success" /> Session complete
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-destructive" /> Time's up
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {pack ? `${pack.title} · ${pack.subtitle}` : "Session summary"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="Learned" value={`${learned} / ${total}`} />
          <Stat label="Progress" value={formatPercent(progress, 0)} />
          <Stat label="Correct" value={session.stats.correct} tone="success" />
          <Stat label="Wrong" value={session.stats.wrong} tone="destructive" />
          <Stat label="Skipped" value={session.stats.skipped} />
          <Stat label="Best streak" value={session.stats.bestStreak} />
        </div>

        <DialogFooter className="!justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              abandon();
              onReturn();
            }}
          >
            Close
          </Button>
          <Button onClick={onRestart}>
            <RotateCw className="h-4 w-4" /> Restart pack
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "success" | "destructive";
}) {
  const t =
    tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "";
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/40 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold tabular-nums ${t}`}>{value}</p>
    </div>
  );
}

export const SessionSummaryDialog = memo(SessionSummaryDialogInner);
