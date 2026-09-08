import { ProjectTabs } from "@/components/shared/project-tabs";

export default function SupervisorProjectDetail({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <ProjectTabs
      projectId={params.projectId}
      role="supervisor"
      backHref="/supervisor/projects"
    />
  );
}
