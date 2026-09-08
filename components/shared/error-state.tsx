"use client";

import { AlertTriangle, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Error state with an actual retry affordance — never a blank screen or a
 * swallowed failure. `onRetry` should re-run the same fetch.
 */
export function ErrorState({
  title = "Couldn't load this",
  description = "Something went wrong fetching this data. Check your connection and try again.",
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
        "flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center",
        className
      )}
    >
      <div className="mb-3 rounded-full bg-destructive/10 p-3 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {onRetry ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onRetry}
        >
          <RotateCw className="h-4 w-4" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
