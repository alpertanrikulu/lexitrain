import { motion } from "framer-motion";
import { Compass, Sparkles, Timer, Zap } from "lucide-react";

import { Card } from "@/components/ui/card";

export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="grid h-full place-items-center"
    >
      <Card className="max-w-xl p-8 text-center bg-gradient-mesh">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30">
          <Sparkles className="h-5 w-5" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-balance">
          Pick a vocabulary pack to start a focused 30-minute session.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Lexitrain quietly tracks every word you know, surfaces the ones you don't, and
          keeps the rhythm engaging.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Feature icon={Compass} title="Adaptive">
            Wrong words come back more often — mastered ones fade.
          </Feature>
          <Feature icon={Timer} title="30-min sprint">
            One focused session. Or keep drilling once you hit 100%.
          </Feature>
          <Feature icon={Zap} title="Offline-first">
            All vocabulary is local. Refreshing keeps your progress.
          </Feature>
        </div>
      </Card>
    </motion.div>
  );
}

function Feature({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Compass;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/40 p-3 text-left">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <p className="text-xs font-medium tracking-tight">{title}</p>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{children}</p>
    </div>
  );
}
