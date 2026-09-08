import { ProjectTabs } from "@/components/shared/project-tabs";

export default function StudentProjectPage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <ProjectTabs
      projectId={params.projectId}
      role="student"
      backHref="/student/project"
    />
  );
}
