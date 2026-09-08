/**
 * Typed Firestore data converters. Every query in `lib/firestore/*` attaches one
 * of these so components never touch raw, untyped `DocumentData`.
 */
import {
  type DocumentData,
  type FirestoreDataConverter,
  type PartialWithFieldValue,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
  serverTimestamp,
} from "firebase/firestore";

import type {
  CommentDoc,
  DashboardStatsDoc,
  DocBase,
  ProjectDoc,
  SubmissionDoc,
  TicketDoc,
  UserDoc,
} from "@/lib/types";

/**
 * Builds a converter for a `DocBase`-shaped document: reads stamp `id` from the
 * snapshot; writes drop `id` (timestamps are set explicitly by the mutation
 * helpers, never round-tripped through here).
 */
function makeConverter<T extends DocBase>(): FirestoreDataConverter<T> {
  return {
    toFirestore(model: PartialWithFieldValue<T>): DocumentData {
      const copy: Record<string, unknown> = {
        ...(model as Record<string, unknown>),
      };
      delete copy.id;
      return copy;
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options: SnapshotOptions
    ): T {
      const data = snapshot.data(options) as Omit<T, "id">;
      return { ...(data as T), id: snapshot.id };
    },
  };
}

export const userConverter = makeConverter<UserDoc>();
export const projectConverter = makeConverter<ProjectDoc>();
export const ticketConverter = makeConverter<TicketDoc>();
export const submissionConverter = makeConverter<SubmissionDoc>();
export const commentConverter = makeConverter<CommentDoc>();
export const dashboardStatsConverter = makeConverter<DashboardStatsDoc>();

/** Marker used by mutation helpers where a server-resolved time is required. */
export const now = serverTimestamp;
