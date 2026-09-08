"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-context";

function LoginForm() {
  const { signInWithPassword, signInWithGoogle } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<null | "password" | "google">(null);

  async function run(
    method: "password" | "google",
    fn: () => Promise<void>
  ) {
    setPending(method);
    try {
      await fn();
      // The session cookie is minted by onIdTokenChanged -> /api/session.
      toast.success("Signed in");
      router.replace(next);
    } catch (err) {
      toast.error("Sign-in failed", {
        description: mapAuthError((err as { code?: string }).code),
      });
      setPending(null);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Use your department account to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run("password", () =>
              signInWithPassword(email.trim(), password)
            );
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
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
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={pending !== null}
          >
            {pending === "password" && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Sign in
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          disabled={pending !== null}
          onClick={() => void run("google", signInWithGoogle)}
        >
          {pending === "google" && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          Continue with Google
        </Button>
      </CardContent>
    </Card>
  );
}

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

export default function LoginPage() {
  return (
    <Suspense fallback={<Card className="h-[420px] w-full max-w-sm" />}>
      <LoginForm />
    </Suspense>
  );
}
