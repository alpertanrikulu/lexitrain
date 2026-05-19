import { motion } from "framer-motion";
import {
  CheckCircle2,
  Flame,
  GraduationCap,
  Moon,
  Sun,
  Target,
  Timer,
  Trophy,
  XCircle,
} from "lucide-react";
import { memo, useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { findPack } from "@/data/manifest";
import { useSessionStore } from "@/store/session";
import { useThemeStore } from "@/store/theme";
import { formatDuration, formatPercent } from "@/utils/format";

import { StatCard } from "./StatCard";

function HeaderInner() {
  const session = useSessionStore((s) => s.session);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const pack = useMemo(() => (session ? findPack(session.packId) : undefined), [session]);

  const total = session?.wordIds.length ?? 0;
  const learned = session?.stats.learned ?? 0;
  const progress = total === 0 ? 0 : learned / total;

  return (
    <header className="glass flex flex-col gap-3 rounded-2xl p-4 lg:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="leading-tight min-w-0">
            <p className="truncate text-base font-semibold tracking-tight">
              {pack ? pack.title : "Pick a pack to begin"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {pack
                ? `${pack.subtitle} · ${pack.size} words`
                : "Choose a vocabulary pack from the sidebar."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session?.fullyLearned && (
            <Badge variant="success" className="gap-1">
              <Trophy className="h-3 w-3" /> 100% learned
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <StatCard
          icon={Timer}
          label="Timer"
          value={session ? formatDuration(session.timeRemainingMs) : "30:00"}
          hint={session?.fullyLearned ? "Drilling mode" : "30 min session"}
          tone={session && session.timeRemainingMs < 60_000 ? "destructive" : "default"}
        />
        <StatCard
          icon={Target}
          label="Progress"
          value={formatPercent(progress, 0)}
          hint={`${learned} / ${total || "—"} words`}
          tone="accent"
        />
        <StatCard
          icon={CheckCircle2}
          label="Correct"
          value={session?.stats.correct ?? 0}
          tone="success"
        />
        <StatCard
          icon={XCircle}
          label="Wrong"
          value={session?.stats.wrong ?? 0}
          tone="destructive"
        />
        <StatCard
          icon={Flame}
          label="Streak"
          value={session?.stats.streak ?? 0}
          hint={`Best ${session?.stats.bestStreak ?? 0}`}
          tone="accent"
        />
        <StatCard
          icon={GraduationCap}
          label="Learned"
          value={`${learned}/${total || "—"}`}
        />
      </div>

      <div className="flex items-center gap-3">
        <Progress value={Math.round(progress * 100)} className="h-2" />
        <motion.span
          key={Math.round(progress * 100)}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-12 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground"
        >
          {formatPercent(progress)}
        </motion.span>
      </div>
    </header>
  );
}

export const Header = memo(HeaderInner);
