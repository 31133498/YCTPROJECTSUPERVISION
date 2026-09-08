import "server-only";

import { FieldValue, type Firestore, type WriteBatch } from "firebase-admin/firestore";

export type NotificationKind =
  | "ticket"
  | "submission"
  | "comment"
  | "review"
  | "project";

/**
 * Queue a notification into `users/{uid}/notifications` on an existing batch.
 * The bell in the top bar listens to this subcollection via onSnapshot.
 */
export function queueNotification(
  batch: WriteBatch,
  db: Firestore,
  uid: string,
  n: { kind: NotificationKind; title: string; href: string; actorName?: string }
): void {
  if (!uid) return;
  const ref = db.collection(`users/${uid}/notifications`).doc();
  batch.set(ref, {
    kind: n.kind,
    title: n.title,
    href: n.href,
    actorName: n.actorName ?? "",
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}
