import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="mx-auto flex w-full max-w-md items-center gap-2 px-6 pt-10">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background">
          <span className="text-xs font-bold">P</span>
        </div>
        <span className="text-sm font-semibold tracking-tight">
          Project Supervision
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        {children}
      </main>

      <footer className="mx-auto w-full max-w-md px-6 pb-10 text-xs text-muted-foreground">
        YABATECH ND · Digital Project Supervision &amp; Progress Tracking ·{" "}
        <Link href="/login" className="underline-offset-4 hover:underline">
          Sign in
        </Link>
      </footer>
    </div>
  );
}
