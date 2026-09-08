/** Typed query functions for `projects/{projectId}/submissions`. */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { getDb } from "@/lib/firebase";
import type {
  SubmissionDoc,
  SubmissionKind,
  SubmissionStatus,
} from "@/lib/types";
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

/**
 * Submission history for a project, newest first.
 * Composite index: (projectId collection) + createdAt desc.
 */
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

export interface CreateSubmissionInput {
  projectId: string;
  title: string;
  kind: SubmissionKind;
  version: number;
  storagePath: string;
  fileName: string;
  fileSize: number;
  submittedById: string;
  submittedByName: string;
}

export async function createSubmission(
  input: CreateSubmissionInput
): Promise<string> {
  const { projectId, ...rest } = input;
  const ref = await addDoc(submissionsCol(projectId), {
    projectId,
    ...rest,
    status: "pending_review" satisfies SubmissionStatus,
    commentCount: 0,
    createdAt: serverTimestamp() as never,
    updatedAt: serverTimestamp() as never,
  } as Partial<SubmissionDoc>);
  return ref.id;
}

export async function setSubmissionStatus(
  projectId: string,
  submissionId: string,
  status: SubmissionStatus
): Promise<void> {
  await updateDoc(doc(getDb(), paths.submission(projectId, submissionId)), {
    status,
    updatedAt: serverTimestamp(),
  });
}
