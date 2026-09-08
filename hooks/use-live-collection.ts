"use client";

import { useEffect, useRef, useState } from "react";
import type { Unsubscribe } from "firebase/firestore";

import type { QueryPhase } from "./use-paginated-query";

type Subscribe<T> = (handlers: {
  next: (items: T[]) => void;
  error: (err: Error) => void;
}) => Unsubscribe;

export interface LiveCollectionResult<T> {
  phase: QueryPhase;
  items: T[];
  error: Error | null;
}

/**
 * Attaches ONE `onSnapshot` listener for the active view and tears it down on
 * unmount or when `deps` change. This is the only sanctioned way to use
 * real-time data in a component — it can't leak across route changes.
 *
 * Pass a `subscribe*` helper from `lib/firestore/listeners`.
 */
export function useLiveCollection<T>(
  subscribe: Subscribe<T>,
  deps: React.DependencyList
): LiveCollectionResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [phase, setPhase] = useState<QueryPhase>("loading");
  const subscribeRef = useRef(subscribe);
  subscribeRef.current = subscribe;

  useEffect(() => {
    setPhase("loading");
    setError(null);

    const unsub = subscribeRef.current({
      next: (next) => {
        setItems(next);
        setPhase(next.length === 0 ? "empty" : "ready");
      },
      error: (err) => {
        setError(err);
        setPhase("error");
      },
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { phase, items, error };
}
