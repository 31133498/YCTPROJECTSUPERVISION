import { NextResponse, type NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { canUploadSubmission } from "@/lib/server/project-access";
import { createSubmissionUploadUrl } from "@/lib/supabase-admin";
import { storagePaths } from "@/lib/firestore/paths";

export const runtime = "nodejs";

/**
 * POST { projectId, submissionId, fileName }
 *  -> { signedUrl, token, path }  (one-time Supabase upload URL)
 *
 * Guard: caller must be the project's own student. The browser then PUTs the
 * file straight to Supabase — it never transits this function.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { projectId?: string; submissionId?: string; fileName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { projectId, submissionId, fileName } = body;
  if (!projectId || !submissionId || !fileName) {
    return NextResponse.json(
      { error: "projectId, submissionId and fileName are required" },
      { status: 400 }
    );
  }

  if (!(await canUploadSubmission(user, projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const safeName = fileName.replace(/[^\w.\-]+/g, "_");
  const storagePath = storagePaths.submissionFile(
    projectId,
    submissionId,
    safeName
  );

  try {
    const signed = await createSubmissionUploadUrl(storagePath);
    return NextResponse.json({ ...signed, fileName: safeName });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
