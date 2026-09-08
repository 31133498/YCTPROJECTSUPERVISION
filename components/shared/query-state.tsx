"use client";

import type { ReactNode } from "react";

import type { QueryPhase } from "@/hooks/use-paginated-query";
import { ErrorState } from "./error-state";

/**
 * The three-explicit-states contract for every data-fetching view:
 *   loading -> `skeleton` (shaped like the real content, dimensions reserved)
 *   error   -> <ErrorState> with a retry button
 *   empty   -> `empty` (real empty-state copy)
 *   ready   -> `children`
 *
 * There is no "default"/blank branch — every phase renders something.
 */
export function QueryState({
  phase,
  error,
  onRetry,
  skeleton,
  empty,
  errorTitle,
  errorDescription,
  children,
}: {
  phase: QueryPhase;
  error?: Error | null;
  onRetry?: () => void;
  skeleton: ReactNode;
  empty: ReactNode;
  errorTitle?: string;
  errorDescription?: string;
  children: ReactNode;
}) {
  if (phase === "loading") return <>{skeleton}</>;
  if (phase === "error") {
    return (
      <ErrorState
        title={errorTitle}
        description={errorDescription ?? error?.message}
        onRetry={onRetry}
      />
    );
  }
  if (phase === "empty") return <>{empty}</>;
  return <>{children}</>;
}
