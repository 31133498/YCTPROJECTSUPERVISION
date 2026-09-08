import { requireRole } from "@/lib/auth/session";
import { AppShell } from "@/components/shared/app-shell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("student");
  return <AppShell user={user}>{children}</AppShell>;
}
