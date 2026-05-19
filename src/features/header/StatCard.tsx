import { motion } from "framer-motion";
import { memo, type ComponentType, type ReactNode } from "react";

import { cn } from "@/lib/cn";

interface StatCardProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "success" | "destructive" | "accent";
}

const toneMap: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-foreground",
  success: "text-success",
  destructive: "text-destructive",
  accent: "text-accent",
};

function StatCardInner({ icon: Icon, label, value, hint, tone = "default" }: StatCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.2, 0.6, 0.2, 1] }}
      className="glass flex min-w-[120px] flex-1 items-center gap-3 rounded-xl px-3 py-2.5"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/70">
        <Icon className={cn("h-4 w-4", toneMap[tone])} />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className={cn("text-base font-semibold tabular-nums", toneMap[tone])}>{value}</p>
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </div>
    </motion.div>
  );
}

export const StatCard = memo(StatCardInner);
