"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { QueryPhase } from "./use-paginated-query";

export interface AsyncDataResult<T> {
  phase: QueryPhase;
  data: T | null;
  error: Error | null;
  retry: () => void;
}

/**
 * One-shot async read (a single doc, an aggregate) with the same four explicit
 * phases as the list hooks. `empty` means the loader resolved to `null`.
 */
export function useAsyncData<T>(
  loader: () => Promise<T | null>,
  deps: React.DependencyList = []
): AsyncDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [phase, setPhase] = useState<QueryPhase>("loading");
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const runIdRef = useRef(0);

  const run = useCallback(() => {
    const runId = ++runIdRef.current;
    setPhase("loading");
    setError(null);
    loaderRef
      .current()
      .then((result) => {
        if (runId !== runIdRef.current) return;
        setData(result);
        setPhase(result === null ? "empty" : "ready");
      })
      .catch((err: unknown) => {
        if (runId !== runIdRef.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setPhase("error");
      });
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(run, deps);

  return { phase, data, error, retry: run };
}
