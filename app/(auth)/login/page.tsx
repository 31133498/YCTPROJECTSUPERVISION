"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth/auth-context";

function mapAuthError(code?: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again in a few minutes.";
    case "auth/popup-closed-by-user":
      return "The Google sign-in window was closed.";
    default:
      return "Please try again.";
  }
}

function LoginForm() {
  const { signInWithPassword, signInWithGoogle } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<null | "password" | "google">(null);

  async function run(method: "password" | "google", fn: () => Promise<void>) {
    setPending(method);
    try {
      await fn();
      router.replace(next);
    } catch (err) {
      toast.error("Sign-in failed", {
        description: mapAuthError((err as { code?: string }).code),
      });
      setPending(null);
    }
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Continue to your supervision workspace.
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run("password", () => signInWithPassword(email.trim(), password));
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yabatech.edu.ng"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" loading={pending === "password"}>
          Sign in
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-2xs uppercase tracking-wider text-muted-foreground">
          or
        </span>
        <Separator className="flex-1" />
      </div>

      <Button
        variant="outline"
        className="w-full"
        loading={pending === "google"}
        onClick={() => void run("google", signInWithGoogle)}
      >
        Continue with Google
      </Button>

      <p className="mt-6 text-sm text-muted-foreground">
        No account?{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-72" />}>
      <LoginForm />
    </Suspense>
  );
}
