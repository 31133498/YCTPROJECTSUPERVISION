/**
 * Real-time listeners. Rules for this layer:
 *  - `onSnapshot` is only ever attached from the single active view.
 *  - Every helper returns the `Unsubscribe` so the caller can (must) detach on
 *    unmount. Use the `useLiveCollection` hook below rather than calling these
 *    directly from components — it wires cleanup for you.
 *  - No listener is left running across a route change.
 */
import {
  type Query,
  type Unsubscribe,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { getDb } from "@/lib/firebase";
import type { ProjectDoc, TicketDoc } from "@/lib/types";
import { projectConverter, ticketConverter } from "./converters";
import { paths } from "./paths";

type Handlers<T> = {
  next: (items: T[]) => void;
  error?: (err: Error) => void;
};

function subscribeToQuery<T>(
  q: Query<T>,
  { next, error }: Handlers<T>
): Unsubscribe {
  return onSnapshot(
    q,
    (snap) => next(snap.docs.map((d) => d.data())),
    (err) => error?.(err)
  );
}

/** Live ticket feed for the currently-open project view. Capped to `max`. */
export function subscribeProjectTickets(
  projectId: string,
  handlers: Handlers<TicketDoc>,
  max = 50
): Unsubscribe {
  const q = query(
    collection(getDb(), paths.tickets(projectId)).withConverter(ticketConverter),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return subscribeToQuery(q, handlers);
}

/** Live single-project doc — for the project header on the active view. */
export function subscribeProject(
  projectId: string,
  {
    next,
    error,
  }: {
    next: (project: ProjectDoc | null) => void;
    error?: (err: Error) => void;
  }
): Unsubscribe {
  return onSnapshot(
    doc(getDb(), paths.project(projectId)).withConverter(projectConverter),
    (snap) => next(snap.exists() ? snap.data() : null),
    (err) => error?.(err)
  );
}
