import { memo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePackSelection } from "@/hooks/usePackSelection";
import { useSessionStore } from "@/store/session";

import { EmptyState } from "../session/EmptyState";
import { StudyWorkspace } from "./StudyWorkspace";

function StudyShellInner() {
  const session = useSessionStore((s) => s.session);
  const { loading, error, words } = usePackSelection();

  if (!session) return <EmptyState />;

  if (loading) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Failed to load pack</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="rounded-md bg-secondary/40 p-3 text-xs text-muted-foreground">
            {error}
          </pre>
        </CardContent>
      </Card>
    );
  }

  return <StudyWorkspace words={words} />;
}

export const StudyShell = memo(StudyShellInner);
