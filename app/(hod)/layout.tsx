import { requireRole } from "@/lib/auth/session";
import { AppShell } from "@/components/shared/app-shell";

export default async function HodLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("hod");
  return <AppShell user={user}>{children}</AppShell>;
}
