/**
 * Client-side Firebase SDK — lazily initialised.
 *
 * Used for Auth + Firestore only. File storage is handled by Supabase Storage
 * (see `lib/supabase.ts`) — the project is on the Spark plan, no Firebase
 * Storage.
 *
 * Every value is read from `NEXT_PUBLIC_*` env vars (safe to expose in the
 * browser bundle — see README). Nothing is hardcoded. Init is deferred to first
 * use so importing this during SSR / `next build` prerender doesn't throw.
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function assertConfig(): void {
  const required = [
    "apiKey",
    "authDomain",
    "projectId",
    "messagingSenderId",
    "appId",
  ] as const;
  const missing = required.filter((k) => !firebaseConfig[k]);
  if (missing.length > 0) {
    throw new Error(
      `Firebase client config incomplete. Missing: ${missing
        .map((k) => `NEXT_PUBLIC_FIREBASE_${k.toUpperCase()}`)
        .join(", ")}. Set them in .env.local / Vercel.`
    );
  }
}

let cachedApp: FirebaseApp | undefined;
let cachedAuth: Auth | undefined;
let cachedDb: Firestore | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  assertConfig();
  cachedApp =
    getApps().length === 0
      ? initializeApp(firebaseConfig as Record<string, string>)
      : getApp();
  return cachedApp;
}

export function getFirebaseAuth(): Auth {
  return (cachedAuth ??= getAuth(getFirebaseApp()));
}

export function getDb(): Firestore {
  return (cachedDb ??= getFirestore(getFirebaseApp()));
}
