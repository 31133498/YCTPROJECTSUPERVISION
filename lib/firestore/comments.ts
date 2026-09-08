/** Typed query functions for submission comment threads. */
import {
  addDoc,
  collection,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { getDb } from "@/lib/firebase";
import type { CommentDoc, Role } from "@/lib/types";
import { commentConverter } from "./converters";
import { fetchPage, type Page, type PageParams } from "./pagination";
import { paths } from "./paths";

const commentsCol = (projectId: string, submissionId: string) =>
  collection(getDb(), paths.comments(projectId, submissionId)).withConverter(
    commentConverter
  );

/** Thread for one submission, oldest first (chronological reading order). */
export function getCommentsPage(
  projectId: string,
  submissionId: string,
  params?: PageParams
): Promise<Page<CommentDoc>> {
  const q = query(
    commentsCol(projectId, submissionId),
    orderBy("createdAt", "asc")
  );
  return fetchPage(q, params);
}

export interface CreateCommentInput {
  projectId: string;
  submissionId: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  body: string;
}

export async function createComment(
  input: CreateCommentInput
): Promise<string> {
  const { projectId, submissionId, ...rest } = input;
  const ref = await addDoc(commentsCol(projectId, submissionId), {
    projectId,
    submissionId,
    ...rest,
    createdAt: serverTimestamp() as never,
    updatedAt: serverTimestamp() as never,
  } as Partial<CommentDoc>);
  return ref.id;
}
