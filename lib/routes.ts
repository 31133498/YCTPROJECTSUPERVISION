import type { Role } from "@/lib/types";

/** Client-safe role -> landing path (server mirror lives in lib/auth/session.ts). */
export function homePathForRole(role: Role): string {
  return {
    student: "/student/dashboard",
    supervisor: "/supervisor/dashboard",
    hod: "/hod/dashboard",
  }[role];
}
