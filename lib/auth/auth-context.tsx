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
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase";
import { api } from "@/lib/api";
import type { Role } from "@/lib/types";

export interface SignUpInput {
  displayName: string;
  email: string;
  password: string;
  role: Role;
  department: string;
}

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
  signUp: (input: SignUpInput) => Promise<Role>;
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

  const signUp = useCallback(async (input: SignUpInput): Promise<Role> => {
    const auth = getFirebaseAuth();
    const cred = await createUserWithEmailAndPassword(
      auth,
      input.email.trim(),
      input.password
    );
    await updateProfile(cred.user, { displayName: input.displayName.trim() });
    const idToken = await cred.user.getIdToken();
    await api.provisionAccount({
      idToken,
      role: input.role,
      department: input.department,
      displayName: input.displayName.trim(),
    });
    // Force a token refresh so the new custom claims land, which re-fires
    // onIdTokenChanged -> session cookie is minted with role + department.
    await cred.user.getIdToken(true);
    return input.role;
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
      signUp,
      signOutUser,
    }),
    [
      user,
      claims,
      loading,
      signInWithPassword,
      signInWithGoogle,
      signUp,
      signOutUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
