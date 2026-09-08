/**
 * Single source of truth for collection paths. Import these instead of writing
 * string literals so the subcollection layout stays consistent everywhere.
 *
 *   users/{uid}
 *   dashboard_stats/{supervisorId}
 *   projects/{projectId}
 *   projects/{projectId}/tickets/{ticketId}
 *   projects/{projectId}/submissions/{submissionId}
 *   projects/{projectId}/submissions/{submissionId}/comments/{commentId}
 */
export const paths = {
  users: "users",
  user: (uid: string) => `users/${uid}`,

  dashboardStats: "dashboard_stats",
  dashboardStat: (supervisorId: string) =>
    `dashboard_stats/${supervisorId}`,

  projects: "projects",
  project: (projectId: string) => `projects/${projectId}`,

  tickets: (projectId: string) => `projects/${projectId}/tickets`,
  ticket: (projectId: string, ticketId: string) =>
    `projects/${projectId}/tickets/${ticketId}`,

  submissions: (projectId: string) => `projects/${projectId}/submissions`,
  submission: (projectId: string, submissionId: string) =>
    `projects/${projectId}/submissions/${submissionId}`,

  comments: (projectId: string, submissionId: string) =>
    `projects/${projectId}/submissions/${submissionId}/comments`,
  comment: (projectId: string, submissionId: string, commentId: string) =>
    `projects/${projectId}/submissions/${submissionId}/comments/${commentId}`,
} as const;

/**
 * Supabase Storage object paths — mirrors the Firestore project subtree.
 * Bucket: `SUBMISSIONS_BUCKET`. `SubmissionDoc.storagePath` holds the value of
 * `submissionFile(...)`; resolve it to a signed URL server-side.
 */
export const SUBMISSIONS_BUCKET = "submissions";

export const storagePaths = {
  submissionFile: (
    projectId: string,
    submissionId: string,
    fileName: string
  ) => `projects/${projectId}/submissions/${submissionId}/${fileName}`,
};
