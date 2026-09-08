import { requireRole } from "@/lib/auth/session";
import { AppShell } from "@/components/shared/app-shell";

export default async function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("supervisor");
  return <AppShell user={user}>{children}</AppShell>;
}
