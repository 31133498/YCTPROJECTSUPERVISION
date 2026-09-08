/**
 * `users/{uid}/notifications` — the top-bar bell's live feed. Written only by
 * API routes; the owner reads it and may flip `read`.
 */
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";

import { getDb } from "@/lib/firebase";
import type { NotificationDoc } from "@/lib/types";

/** Live feed, newest first, capped. Returns the unsubscribe — call on unmount. */
export function subscribeNotifications(
  uid: string,
  handlers: {
    next: (items: NotificationDoc[]) => void;
    error?: (e: Error) => void;
  },
  max = 25
): Unsubscribe {
  const q = query(
    collection(getDb(), `users/${uid}/notifications`),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(
    q,
    (snap) =>
      handlers.next(
        snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as NotificationDoc
        )
      ),
    (e) => handlers.error?.(e)
  );
}

export async function markNotificationsRead(
  uid: string,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  const db = getDb();
  const batch = writeBatch(db);
  for (const id of ids.slice(0, 400)) {
    batch.update(doc(db, `users/${uid}/notifications/${id}`), { read: true });
  }
  await batch.commit();
}
