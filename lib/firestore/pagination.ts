/**
 * Cursor pagination primitives. Every list query in this layer returns a
 * `Page<T>` and accepts a `PageParams` cursor — we page with Firestore
 * `startAfter(snapshot)`, never `offset`, so cost stays flat as data grows.
 */
import {
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot,
  getDocs,
  limit as fbLimit,
  query as fbQuery,
  startAfter,
} from "firebase/firestore";

export const DEFAULT_PAGE_SIZE = 20;

export interface PageParams {
  /** Opaque cursor — pass back `Page.cursor` from the previous call. */
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
  pageSize?: number;
}

export interface Page<T> {
  items: T[];
  /** Feed into the next `PageParams.cursor`. `null` once exhausted. */
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Runs a converter-typed query one page at a time. Fetches `pageSize + 1` to
 * detect `hasMore` without a second round trip.
 */
export async function fetchPage<T>(
  baseQuery: Query<T>,
  { cursor, pageSize = DEFAULT_PAGE_SIZE }: PageParams = {}
): Promise<Page<T>> {
  const constraints = cursor
    ? [startAfter(cursor), fbLimit(pageSize + 1)]
    : [fbLimit(pageSize + 1)];

  const snap = await getDocs(fbQuery(baseQuery, ...constraints));
  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;

  return {
    items: pageDocs.map((d) => d.data()),
    cursor: pageDocs.length
      ? (pageDocs[pageDocs.length - 1] as QueryDocumentSnapshot<DocumentData>)
      : null,
    hasMore,
  };
}
