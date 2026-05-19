import { motion } from "framer-motion";
import {
  ChevronDown,
  CircleCheck,
  Layers,
  Search,
  Sparkles,
} from "lucide-react";
import { memo, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PACK_GROUPS } from "@/data/manifest";
import { cn } from "@/lib/cn";
import { useSessionStore } from "@/store/session";
import type { CEFRLevel, PackManifestEntry } from "@/types";

interface SidebarProps {
  onSelect: (pack: PackManifestEntry) => void;
  loadingPackId: string | null;
}

const initiallyOpen: Record<CEFRLevel, boolean> = {
  a1: true,
  a2: true,
  b1: false,
  b2: false,
  c1: false,
  c2: false,
  pv: false,
};

function SidebarInner({ onSelect, loadingPackId }: SidebarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(initiallyOpen);
  const packProgress = useSessionStore((s) => s.packProgress);
  const activePackId = useSessionStore((s) => s.session?.packId);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PACK_GROUPS;
    return PACK_GROUPS.map((g) => ({
      ...g,
      packs: g.packs.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q) ||
          g.label.toLowerCase().includes(q),
      ),
    })).filter((g) => g.packs.length > 0);
  }, [query]);

  return (
    <TooltipProvider delayDuration={120}>
      <aside
        className="glass flex h-full w-72 shrink-0 flex-col gap-3 rounded-2xl p-4"
        aria-label="Vocabulary packs"
      >
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Lexitrain</p>
            <p className="text-[11px] text-muted-foreground">Adaptive vocabulary</p>
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search packs…"
            className="pl-7 h-8 text-xs"
            aria-label="Search packs"
          />
        </div>

        <ScrollArea className="-mr-2 h-full pr-2 scroll-fade">
          <div className="flex flex-col gap-3 py-1">
            {groups.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                No packs match “{query}”.
              </p>
            )}
            {groups.map((g) => {
              const isOpen = open[g.level];
              return (
                <section key={g.level}>
                  <button
                    type="button"
                    onClick={() => setOpen((s) => ({ ...s, [g.level]: !s[g.level] }))}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-secondary/60 focus-ring transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {g.label}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {isOpen && (
                    <ul className="mt-1 flex flex-col gap-1">
                      {g.packs.map((p) => {
                        const prog = packProgress[p.id];
                        const ratio =
                          prog && prog.total > 0 ? prog.learned / prog.total : 0;
                        const completed = ratio >= 1;
                        const isActive = activePackId === p.id;
                        const isLoading = loadingPackId === p.id;
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => onSelect(p)}
                              disabled={isLoading}
                              className={cn(
                                "group relative flex w-full flex-col gap-1.5 rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors focus-ring",
                                "hover:bg-secondary/60",
                                isActive &&
                                  "border-primary/30 bg-primary/10 hover:bg-primary/15",
                              )}
                              aria-current={isActive ? "true" : undefined}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="line-clamp-1 text-[13px] font-medium leading-tight">
                                  {p.title}
                                </span>
                                {completed && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="success" className="px-1.5 py-0">
                                        <CircleCheck className="h-3 w-3" />
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>All words learned</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <p className="line-clamp-1 text-[11px] text-muted-foreground">
                                {p.subtitle} · {p.size} words
                              </p>
                              <Progress
                                value={Math.min(100, Math.round(ratio * 100))}
                                className="h-1"
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </ScrollArea>

        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/40 px-3 py-2"
        >
          <Layers className="h-4 w-4 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">
            32 packs · 6 levels + phrasal verbs · adaptive
          </p>
        </motion.div>
      </aside>
    </TooltipProvider>
  );
}

export const Sidebar = memo(SidebarInner);

export function SidebarSkeleton() {
  return (
    <aside className="glass flex h-full w-72 shrink-0 flex-col gap-3 rounded-2xl p-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-8 w-full" />
      <div className="space-y-2 pt-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </aside>
  );
}
