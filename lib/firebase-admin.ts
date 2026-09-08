import "server-only";

/**
 * Server-side Firebase Admin SDK — lazily initialised.
 *
 * Reads `FIREBASE_SERVICE_ACCOUNT_KEY` — a full service-account JSON string,
 * server-only, NEVER prefixed `NEXT_PUBLIC_`. Set it in Vercel's server env for
 * both Preview and Production. See README ("server-only Firebase keys").
 *
 * Init is deferred to first use (not module load) so that `next build`'s
 * page-data collection doesn't crash on machines/CI without the key. Route
 * handlers and server components call `getAdminAuth()` / `getAdminDb()` /
 * `getAdminStorage()`.
 */
import {
  getApps,
  initializeApp,
  cert,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add the service-account JSON to the server environment (Vercel: Preview + Production)."
    );
  }
  try {
    const parsed = JSON.parse(raw) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      // Vercel stores the key with escaped newlines.
      privateKey: parsed.private_key.replace(/\\n/g, "\n"),
    };
  } catch (err) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON: ${
        (err as Error).message
      }`
    );
  }
}

let cachedApp: App | undefined;

function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  cachedApp =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: cert(loadServiceAccount()),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
  return cachedApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminStorage(): Storage {
  return getStorage(getAdminApp());
}
