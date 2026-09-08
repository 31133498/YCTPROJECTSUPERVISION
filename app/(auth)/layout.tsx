import { GraduationCap } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-6 flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-primary" />
        <span className="text-base font-semibold">
          Digital Project Supervision
        </span>
      </div>
      {children}
      <p className="mt-6 text-xs text-muted-foreground">
        YABATECH ND Project &middot; Progress Tracking System
      </p>
    </div>
  );
}
