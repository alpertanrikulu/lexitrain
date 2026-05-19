import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[Lexitrain] render error:", error, info.componentStack);
    }
  }

  handleReset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Something broke.</CardTitle>
            <CardDescription>
              The app hit an unexpected error. Your progress is safe in local storage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="max-h-32 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
              {this.state.error.message}
            </pre>
            <div className="flex gap-2">
              <Button onClick={this.handleReset}>Try again</Button>
              <Button variant="outline" onClick={() => location.reload()}>
                Reload app
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
