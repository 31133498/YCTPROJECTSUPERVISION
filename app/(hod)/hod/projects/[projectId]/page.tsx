import { ProjectTabs } from "@/components/shared/project-tabs";

export default function HodProjectDetail({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <ProjectTabs
      projectId={params.projectId}
      role="hod"
      backHref="/hod/projects"
    />
  );
}
