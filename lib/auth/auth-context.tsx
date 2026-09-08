"use client";

/**
 * Client auth state. This is a convenience mirror for rendering (show the user's
 * name, hide a button) — it is NOT an access-control boundary. Real enforcement
 * is server-side in `requireRole()` and in `firestore.rules` / `storage.rules`.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase";
import type { Role } from "@/lib/types";

interface AuthClaimsState {
  role: Role | null;
  department: string | null;
}

interface AuthContextValue {
  user: User | null;
  claims: AuthClaimsState;
  /** `true` until the first auth state resolves — gate UI on this. */
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function syncSessionCookie(user: User | null): Promise<void> {
  if (!user) {
    await fetch("/api/session", { method: "DELETE" });
    return;
  }
  const idToken = await user.getIdToken();
  await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<AuthClaimsState>({
    role: null,
    department: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onIdTokenChanged fires on sign-in/out AND on token refresh, so the
    // session cookie and custom claims stay current.
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        const res = await nextUser.getIdTokenResult();
        setClaims({
          role: (res.claims.role as Role | undefined) ?? null,
          department: (res.claims.department as string | undefined) ?? null,
        });
        await syncSessionCookie(nextUser);
      } else {
        setClaims({ role: null, department: null });
        await syncSessionCookie(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(getFirebaseAuth());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      claims,
      loading,
      signInWithPassword,
      signInWithGoogle,
      signOutUser,
    }),
    [user, claims, loading, signInWithPassword, signInWithGoogle, signOutUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
