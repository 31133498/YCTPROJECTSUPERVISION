"use client";

/**
 * Submission file transfer <-> private Supabase Storage bucket `submissions`.
 *
 * Uploads:   ask our server for a one-time signed upload URL (it checks the
 *            Firebase session + project ownership), then PUT the bytes straight
 *            to Supabase. The file never transits the Vercel function.
 * Downloads: ask our server for a short-lived signed URL (it checks read access).
 *
 * The bucket has no public/anon policy — all access is via these server-minted
 * URLs, so there are no per-user Storage RLS policies to maintain.
 */
import { getSupabase } from "@/lib/supabase";
import { SUBMISSIONS_BUCKET } from "@/lib/firestore/paths";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/png",
  "image/jpeg",
]);

export interface UploadedSubmissionFile {
  storagePath: string;
  fileName: string;
  fileSize: number;
}

export async function uploadSubmissionFile(params: {
  projectId: string;
  submissionId: string;
  file: File;
}): Promise<UploadedSubmissionFile> {
  const { projectId, submissionId, file } = params;

  if (file.size > MAX_BYTES) throw new Error("File is larger than 25 MB.");
  if (file.type && !ALLOWED.has(file.type)) {
    throw new Error("Only PDF, Word, PNG or JPEG files are allowed.");
  }

  const signRes = await fetch("/api/submissions/sign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, submissionId, fileName: file.name }),
  });
  if (!signRes.ok) {
    throw new Error(
      (await signRes.json().catch(() => ({}))).error ??
        "Could not authorise upload."
    );
  }
  const { path, token, fileName } = (await signRes.json()) as {
    path: string;
    token: string;
    fileName: string;
  };

  const { error } = await getSupabase()
    .storage.from(SUBMISSIONS_BUCKET)
    .uploadToSignedUrl(path, token, file, {
      contentType: file.type || undefined,
    });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  return { storagePath: path, fileName, fileSize: file.size };
}

/** Resolve a stored submission path to a temporary, viewable URL. */
export async function getSubmissionDownloadUrl(params: {
  projectId: string;
  storagePath: string;
}): Promise<string> {
  const res = await fetch("/api/submissions/sign-download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(
      (await res.json().catch(() => ({}))).error ??
        "Could not get the file link."
    );
  }
  return ((await res.json()) as { url: string }).url;
}
