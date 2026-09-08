"use client";

/**
 * Submission file transfer <-> private Supabase Storage bucket `submissions`.
 *
 * Upload:   ask our server for a one-time signed upload URL (it checks the
 *           Firebase session + project ownership), then PUT the bytes straight
 *           to Supabase over XHR so we get a real progress bar. Bytes never
 *           transit the Vercel function.
 * Download: ask our server for a short-lived signed URL (it checks read access).
 *
 * The bucket has no public/anon policy — all access is via these server-minted
 * URLs, so there are no per-user Storage RLS policies to maintain.
 */
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/png",
  "image/jpeg",
]);
export const ACCEPT_ATTR = ".pdf,.doc,.docx,.png,.jpg,.jpeg";

export interface UploadedSubmissionFile {
  storagePath: string;
  fileName: string;
  fileSize: number;
}

export function validateSubmissionFile(file: File): string | null {
  if (file.size > MAX_BYTES) return "File is larger than 25 MB.";
  if (file.type && !ALLOWED.has(file.type)) {
    return "Only PDF, Word, PNG or JPEG files are allowed.";
  }
  return null;
}

export async function uploadSubmissionFile(params: {
  projectId: string;
  submissionId: string;
  file: File;
  onProgress?: (percent: number) => void;
}): Promise<UploadedSubmissionFile> {
  const { projectId, submissionId, file, onProgress } = params;

  const invalid = validateSubmissionFile(file);
  if (invalid) throw new Error(invalid);

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
  const { signedUrl, path, fileName } = (await signRes.json()) as {
    signedUrl: string;
    path: string;
    token: string;
    fileName: string;
  };

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl, true);
    xhr.setRequestHeader("x-upsert", "true");
    if (file.type) xhr.setRequestHeader("content-type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Upload failed — network error"));
    xhr.send(file);
  });

  onProgress?.(100);
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
      (await res.json().catch(() => ({}))).error ?? "Could not get the file link."
    );
  }
  return ((await res.json()) as { url: string }).url;
}
