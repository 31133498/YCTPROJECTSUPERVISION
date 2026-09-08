import type { Role } from "@/lib/types";

/** Client-safe role -> landing path (server mirror lives in lib/auth/session.ts). */
export function homePathForRole(role: Role): string {
  return {
    student: "/student/dashboard",
    supervisor: "/supervisor/dashboard",
    hod: "/hod/dashboard",
  }[role];
}

/** Where each role views a given project. */
export function projectHref(role: Role, projectId: string): string {
  return {
    student: `/student/project/${projectId}`,
    supervisor: `/supervisor/projects/${projectId}`,
    hod: `/hod/projects/${projectId}`,
  }[role];
}
