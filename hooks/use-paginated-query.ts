"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Page, PageParams } from "@/lib/firestore/pagination";

export type QueryPhase = "loading" | "error" | "empty" | "ready";

export interface PaginatedQueryResult<T> {
  phase: QueryPhase;
  items: T[];
  error: Error | null;
  hasMore: boolean;
  /** Loading the *next* page (items already on screen). */
  loadingMore: boolean;
  loadMore: () => void;
  /** Re-run from the first page — wired to <ErrorState onRetry>. */
  retry: () => void;
}

type Fetcher<T> = (params: PageParams) => Promise<Page<T>>;

/**
 * Drives a cursor-paginated `lib/firestore` query through the four explicit
 * phases every list view must handle. No offset paging, no query-in-a-loop —
 * the fetcher is a single typed query function.
 */
export function usePaginatedQuery<T>(
  fetcher: Fetcher<T>,
  deps: React.DependencyList = []
): PaginatedQueryResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [phase, setPhase] = useState<QueryPhase>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const cursorRef = useRef<Page<T>["cursor"]>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const runIdRef = useRef(0);

  const loadFirst = useCallback(() => {
    const runId = ++runIdRef.current;
    setPhase("loading");
    setError(null);
    setItems([]);
    cursorRef.current = null;

    fetcherRef
      .current({ cursor: null })
      .then((page) => {
        if (runId !== runIdRef.current) return;
        cursorRef.current = page.cursor;
        setItems(page.items);
        setHasMore(page.hasMore);
        setPhase(page.items.length === 0 ? "empty" : "ready");
      })
      .catch((err: unknown) => {
        if (runId !== runIdRef.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setPhase("error");
      });
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || !cursorRef.current) return;
    const runId = runIdRef.current;
    setLoadingMore(true);
    fetcherRef
      .current({ cursor: cursorRef.current })
      .then((page) => {
        if (runId !== runIdRef.current) return;
        cursorRef.current = page.cursor;
        setItems((prev) => [...prev, ...page.items]);
        setHasMore(page.hasMore);
      })
      .catch((err: unknown) => {
        if (runId !== runIdRef.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setPhase("error");
      })
      .finally(() => {
        if (runId === runIdRef.current) setLoadingMore(false);
      });
  }, [hasMore, loadingMore]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadFirst, deps);

  return {
    phase,
    items,
    error,
    hasMore,
    loadingMore,
    loadMore,
    retry: loadFirst,
  };
}
