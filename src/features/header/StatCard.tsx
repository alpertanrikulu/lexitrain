import { motion } from "framer-motion";
import { memo, type ComponentType, type ReactNode } from "react";

import { cn } from "@/lib/cn";

interface StatCardProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "success" | "destructive" | "accent";
  className?: string;
}

const toneMap: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-foreground",
  success: "text-success",
  destructive: "text-destructive",
  accent: "text-accent",
};

function StatCardInner({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  className,
}: StatCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.2, 0.6, 0.2, 1] }}
      className={cn(
        "glass flex flex-1 items-center gap-2 rounded-lg px-2.5 py-1.5 lg:min-w-[120px] lg:gap-3 lg:rounded-xl lg:px-3 lg:py-2.5",
        className,
      )}
      title={label}
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary/70 lg:h-8 lg:w-8 lg:rounded-lg">
        <Icon className={cn("h-3.5 w-3.5 lg:h-4 lg:w-4", toneMap[tone])} />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="hidden truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground lg:block">
          {label}
        </p>
        <p className={cn("text-sm font-semibold tabular-nums lg:text-base", toneMap[tone])}>
          {value}
        </p>
        {hint && <p className="hidden text-[10px] text-muted-foreground lg:block">{hint}</p>}
      </div>
    </motion.div>
  );
}

export const StatCard = memo(StatCardInner);
