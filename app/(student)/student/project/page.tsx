"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { getStudentProjectsPage } from "@/lib/firestore";
import { useAsyncData } from "@/hooks/use-async-data";
import { QueryState } from "@/components/shared/query-state";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectDoc } from "@/lib/types";

export default function StudentProjectIndex() {
  const { user } = useAuth();
  const router = useRouter();
  const uid = user?.uid ?? "";

  const project = useAsyncData<ProjectDoc | null>(async () => {
    const page = await getStudentProjectsPage(uid, { pageSize: 1 });
    return page.items[0] ?? null;
  }, [uid]);

  useEffect(() => {
    if (project.data) router.replace(`/student/project/${project.data.id}`);
  }, [project.data, router]);

  return (
    <div>
      <PageHeader title="My project" />
      <QueryState
        phase={project.phase}
        error={project.error}
        onRetry={project.retry}
        skeleton={<Skeleton className="h-40 rounded-lg" />}
        empty={
          <EmptyState
            icon={FolderKanban}
            title="No project yet"
            description="Your supervisor hasn't created your project record."
          />
        }
      >
        <Skeleton className="h-40 rounded-lg" />
      </QueryState>
    </div>
  );
}
