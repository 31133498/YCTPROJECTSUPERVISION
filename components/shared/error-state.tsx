"use client";

import { AlertTriangle, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Error state with a working retry — never a blank screen. */
export function ErrorState({
  title = "Couldn't load this",
  description = "Something went wrong. Check your connection and try again.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-[hsl(var(--status-stalled)/0.3)] bg-[hsl(var(--status-stalled)/0.04)] p-10 text-center",
        className
      )}
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-[hsl(var(--status-stalled)/0.12)] text-[hsl(var(--status-stalled))]">
        <AlertTriangle className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
