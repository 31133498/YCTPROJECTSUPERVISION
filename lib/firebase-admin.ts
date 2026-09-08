import "server-only";

/**
 * Server-side Firebase Admin SDK — lazily initialised. Auth + Firestore only
 * (file storage is Supabase — see `lib/supabase.ts`).
 *
 * Reads `FIREBASE_SERVICE_ACCOUNT_KEY` — a full service-account JSON string,
 * server-only, NEVER prefixed `NEXT_PUBLIC_`. Set it in Vercel's server env for
 * both Preview and Production.
 *
 * Init is deferred to first use (not module load) so that `next build`'s
 * page-data collection doesn't crash on machines/CI without the key.
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
      : initializeApp({ credential: cert(loadServiceAccount()) });
  return cachedApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}
