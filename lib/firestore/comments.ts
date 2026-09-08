/**
 * Typed READ query for submission comment threads. Writes go through
 * `POST /api/projects/[projectId]/submissions/[submissionId]/comments`.
 */
import { collection, orderBy, query } from "firebase/firestore";

import { getDb } from "@/lib/firebase";
import type { CommentDoc } from "@/lib/types";
import { commentConverter } from "./converters";
import { fetchPage, type Page, type PageParams } from "./pagination";
import { paths } from "./paths";

/** Thread for one submission, oldest first (chronological reading order). */
export function getCommentsPage(
  projectId: string,
  submissionId: string,
  params?: PageParams
): Promise<Page<CommentDoc>> {
  const q = query(
    collection(getDb(), paths.comments(projectId, submissionId)).withConverter(
      commentConverter
    ),
    orderBy("createdAt", "asc")
  );
  return fetchPage(q, params);
}
