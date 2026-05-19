import { Menu } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Header } from "@/features/header/Header";
import { SessionSummaryDialog } from "@/features/session/SessionSummaryDialog";
import { Sidebar } from "@/features/sidebar/Sidebar";
import { StudyShell } from "@/features/study/StudyShell";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import { useSessionStore } from "@/store/session";
import type { PackManifestEntry } from "@/types";

export function AppPage() {
  const startSession = useSessionStore((s) => s.startSession);
  const abandon = useSessionStore((s) => s.abandonSession);
  const activePackId = useSessionStore((s) => s.session?.packId);
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  useSessionTimer();

  const handleSelect = useCallback(
    async (pack: PackManifestEntry) => {
      if (loadingPackId) return;
      setLoadingPackId(pack.id);
      try {
        const words = await pack.load();
        startSession(pack.id, words);
        setMobileSidebar(false);
      } catch (err) {
        console.error("[Lexitrain] failed to load pack", err);
      } finally {
        setLoadingPackId(null);
      }
    },
    [loadingPackId, startSession],
  );

  const handleRestart = useCallback(async () => {
    if (!activePackId) return;
    const pack = (await import("@/data/manifest")).findPack(activePackId);
    if (!pack) return;
    const words = await pack.load();
    startSession(activePackId, words);
  }, [activePackId, startSession]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-mesh opacity-70"
        aria-hidden
      />
      <div className="mx-auto flex h-screen max-w-[1440px] gap-4 p-4 lg:p-6">
        <div className="hidden lg:block">
          <Sidebar onSelect={handleSelect} loadingPackId={loadingPackId} />
        </div>
        <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="flex items-center gap-2 lg:hidden">
            <Button
              variant="glass"
              size="sm"
              onClick={() => setMobileSidebar(true)}
              aria-label="Open packs"
            >
              <Menu className="h-4 w-4" /> Packs
            </Button>
          </div>
          <Header />
          <div className="min-h-0 flex-1 overflow-auto pr-1">
            <StudyShell />
          </div>
        </main>
      </div>
      <Dialog open={mobileSidebar} onOpenChange={setMobileSidebar}>
        <DialogContent className="max-h-[85vh] max-w-[20rem] gap-2 p-2 sm:max-w-[20rem]">
          <DialogTitle className="sr-only">Vocabulary packs</DialogTitle>
          <div className="h-[75vh]">
            <Sidebar onSelect={handleSelect} loadingPackId={loadingPackId} />
          </div>
        </DialogContent>
      </Dialog>
      <SessionSummaryDialog onRestart={handleRestart} onReturn={abandon} />
    </div>
  );
}
