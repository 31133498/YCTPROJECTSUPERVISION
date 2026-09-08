/** Typed query functions for `projects/{projectId}`. One export per query. */
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
  MilestoneStatus,
  ProjectDoc,
  ProjectStatus,
} from "@/lib/types";
import { projectConverter } from "./converters";
import { fetchPage, type Page, type PageParams } from "./pagination";
import { paths } from "./paths";

const projectsCol = () =>
  collection(getDb(), paths.projects).withConverter(projectConverter);

export async function getProject(
  projectId: string
): Promise<ProjectDoc | null> {
  const snap = await getDoc(
    doc(getDb(), paths.project(projectId)).withConverter(projectConverter)
  );
  return snap.exists() ? snap.data() : null;
}

/**
 * Supervisor project list, filtered by status.
 * Composite index: (supervisorId ==, status ==, lastActivityAt desc).
 */
export function getSupervisorProjectsPage(
  supervisorId: string,
  status: ProjectStatus,
  params?: PageParams
): Promise<Page<ProjectDoc>> {
  const q = query(
    projectsCol(),
    where("supervisorId", "==", supervisorId),
    where("status", "==", status),
    orderBy("lastActivityAt", "desc")
  );
  return fetchPage(q, params);
}

/**
 * HOD department-wide project list, filtered by milestone health.
 * Composite index: (department ==, milestoneStatus ==, lastActivityAt desc).
 */
export function getDepartmentProjectsPage(
  department: string,
  milestoneStatus: MilestoneStatus | "all",
  params?: PageParams
): Promise<Page<ProjectDoc>> {
  const q =
    milestoneStatus === "all"
      ? query(
          projectsCol(),
          where("department", "==", department),
          orderBy("lastActivityAt", "desc")
        )
      : query(
          projectsCol(),
          where("department", "==", department),
          where("milestoneStatus", "==", milestoneStatus),
          orderBy("lastActivityAt", "desc")
        );
  return fetchPage(q, params);
}

/** The single project owned by a student. */
export function getStudentProjectsPage(
  studentId: string,
  params?: PageParams
): Promise<Page<ProjectDoc>> {
  const q = query(
    projectsCol(),
    where("studentId", "==", studentId),
    orderBy("lastActivityAt", "desc")
  );
  return fetchPage(q, params);
}

export interface CreateProjectInput {
  title: string;
  abstract: string;
  department: string;
  studentId: string;
  studentName: string;
  supervisorId: string;
  supervisorName: string;
}

export async function createProject(
  input: CreateProjectInput
): Promise<string> {
  const ref = await addDoc(projectsCol(), {
    ...input,
    status: "active" satisfies ProjectStatus,
    milestoneStatus: "on_track" satisfies MilestoneStatus,
    nextDeadline: null,
    progressPct: 0,
    openTicketCount: 0,
    createdAt: serverTimestamp() as never,
    updatedAt: serverTimestamp() as never,
    lastActivityAt: serverTimestamp() as never,
  } as Partial<ProjectDoc>);
  return ref.id;
}

export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus
): Promise<void> {
  await updateDoc(doc(getDb(), paths.project(projectId)), {
    status,
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  });
}
