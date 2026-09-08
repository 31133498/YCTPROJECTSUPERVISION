import "server-only";

import { FieldValue, type Firestore, type WriteBatch } from "firebase-admin/firestore";

export type ActivityKind = "submissions" | "comments" | "tickets";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // yyyy-mm-dd (UTC)
}

/**
 * Increment the department's daily activity bucket on an existing batch. The HOD
 * analytics chart reads the last ~30 of these (`activity_daily`), never a live
 * scan across every project.
 *
 * Doc id: `${department}__${yyyy-mm-dd}` (department may contain "/").
 */
export function bumpDailyActivity(
  batch: WriteBatch,
  db: Firestore,
  department: string,
  kind: ActivityKind
): void {
  const day = todayKey();
  const id = `${department.replace(/\//g, "-")}__${day}`;
  batch.set(
    db.doc(`activity_daily/${id}`),
    {
      department,
      day,
      [kind]: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
