/**
 * Typed READ queries for `projects/{projectId}/submissions`. Writes go through
 * `POST /api/projects/[projectId]/submissions`.
 */
import { collection, doc, getDoc, orderBy, query, where } from "firebase/firestore";

import { getDb } from "@/lib/firebase";
import type { SubmissionDoc, SubmissionStatus } from "@/lib/types";
import { submissionConverter } from "./converters";
import { fetchPage, type Page, type PageParams } from "./pagination";
import { paths } from "./paths";

const submissionsCol = (projectId: string) =>
  collection(getDb(), paths.submissions(projectId)).withConverter(
    submissionConverter
  );

export async function getSubmission(
  projectId: string,
  submissionId: string
): Promise<SubmissionDoc | null> {
  const snap = await getDoc(
    doc(getDb(), paths.submission(projectId, submissionId)).withConverter(
      submissionConverter
    )
  );
  return snap.exists() ? snap.data() : null;
}

/** Submission history for a project, newest first. */
export function getSubmissionsPage(
  projectId: string,
  params?: PageParams
): Promise<Page<SubmissionDoc>> {
  const q = query(submissionsCol(projectId), orderBy("createdAt", "desc"));
  return fetchPage(q, params);
}

export function getSubmissionsByStatusPage(
  projectId: string,
  status: SubmissionStatus,
  params?: PageParams
): Promise<Page<SubmissionDoc>> {
  const q = query(
    submissionsCol(projectId),
    where("status", "==", status),
    orderBy("createdAt", "desc")
  );
  return fetchPage(q, params);
}
