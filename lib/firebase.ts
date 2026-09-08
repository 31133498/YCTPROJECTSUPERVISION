/**
 * Client-side Firebase SDK — lazily initialised.
 *
 * Every value is read from `NEXT_PUBLIC_*` env vars (safe to expose in the
 * browser bundle — see README). Nothing is hardcoded.
 *
 * Init is deferred to first use so importing this module during SSR /
 * `next build` prerender (where the vars legitimately aren't present) doesn't
 * throw. Call `getDb()` / `getFirebaseAuth()` / `getFirebaseStorage()`.
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function assertConfig(): void {
  const missing = Object.entries(firebaseConfig)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    throw new Error(
      `Firebase client config incomplete. Missing: ${missing.join(
        ", "
      )}. Copy .env.local.example to .env.local (or set the NEXT_PUBLIC_FIREBASE_* vars in Vercel).`
    );
  }
}

let cachedApp: FirebaseApp | undefined;
let cachedAuth: Auth | undefined;
let cachedDb: Firestore | undefined;
let cachedStorage: FirebaseStorage | undefined;

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

export function getFirebaseStorage(): FirebaseStorage {
  return (cachedStorage ??= getStorage(getFirebaseApp()));
}
