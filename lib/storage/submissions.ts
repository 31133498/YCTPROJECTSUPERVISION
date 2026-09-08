"use client";

/**
 * Submission file uploads -> Supabase Storage (bucket `submissions`).
 *
 * Returns exactly the fields `createSubmission()` needs. Access on read is via
 * a server-minted signed URL (`lib/supabase-admin.ts`), so the bucket is
 * private and guarded by RLS.
 */
import { getSupabase } from "@/lib/supabase";
import { SUBMISSIONS_BUCKET, storagePaths } from "@/lib/firestore/paths";

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

  if (file.size > MAX_BYTES) {
    throw new Error("File is larger than 25 MB.");
  }
  if (file.type && !ALLOWED.has(file.type)) {
    throw new Error("Only PDF, Word, PNG or JPEG files are allowed.");
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const storagePath = storagePaths.submissionFile(
    projectId,
    submissionId,
    safeName
  );

  const { error } = await getSupabase()
    .storage.from(SUBMISSIONS_BUCKET)
    .upload(storagePath, file, {
      upsert: true,
      contentType: file.type || undefined,
    });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  return { storagePath, fileName: safeName, fileSize: file.size };
}
