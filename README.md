# Digital Project Supervision & Progress Tracking System

YABATECH ND project. Supervisors run final-year projects, students submit work and
track milestones, the HOD sees the whole department.

**Stack:** Next.js 14 (App Router) · TypeScript (strict) · Tailwind + shadcn/ui ·
lucide-react · Firebase (Auth / Firestore / Storage) · Cloud Functions · Vercel.

---

## Getting started

```bash
cp .env.local.example .env.local   # then fill it in (see below)
npm install
npm run dev
```

Optional — local Firebase emulators:

```bash
firebase emulators:start
```

---

## Environment variables

Copy `.env.local.example` → `.env.local`. On **Vercel**, add every key under
**Project Settings → Environment Variables** for **both** the `Preview` and
`Production` environments (Development too if you use `vercel dev`).

### Public — Firebase client SDK (safe to expose)

These ship in the browser bundle by design. They only *identify* the Firebase
project; they are **not secrets**. Security is enforced by
`firestore.rules` / `storage.rules` and by verified custom claims — never by
hiding these values.

| Key | Notes |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | |

### Server-only — Firebase Admin SDK (secret)

| Key | Notes |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | **Full service-account JSON, one line.** Never prefix `NEXT_PUBLIC_`. Never commit. On Vercel it lives only in the server environment. Used by `lib/firebase-admin.ts` for session-cookie verification, custom-claims provisioning and privileged reads. |

Generate it at **Firebase console → Project settings → Service accounts →
Generate new private key** and paste the file contents as a single-quoted value.

---

## Auth & roles

- Sign-in is email/password or Google (`lib/auth/auth-context.tsx`, client).
- On every ID-token change the client POSTs the token to
  `app/api/session/route.ts`, which **verifies it server-side** and mints an
  `HttpOnly` session cookie. The browser never sets an auth cookie itself.
- `middleware.ts` is a presence gate only (the Admin SDK can't run on the edge).
- Real enforcement is `requireRole()` in each route group's server layout
  (`lib/auth/session.ts`) **and** the Firestore/Storage rules.
- `role` and `department` are **custom claims**, provisioned by the Admin SDK.
  An account with no claims cannot obtain a session (see the 403 in the session
  route).

Roles: `student` · `supervisor` · `hod`.

---

## Folder structure

```
app/
  (auth)/login            shared sign-in
  (student)/student/...    role-gated: dashboard, project/[projectId]
  (supervisor)/supervisor/...  dashboard, projects, projects/[id], roster
  (hod)/hod/...            dashboard, projects, supervisors, reports
  api/session             session-cookie mint / clear
components/
  ui/                     shadcn primitives
  shared/                 cross-role: status-badge, timeline, notification-panel,
                          app-shell, query-state, empty/error states, skeletons
hooks/                    use-paginated-query, use-live-collection, use-async-data
lib/
  firebase.ts             client SDK (NEXT_PUBLIC_*)
  firebase-admin.ts       admin SDK (server-only)
  auth/                   session (server) + auth-context (client)
  firestore/              typed query layer — one function per query
  types.ts                domain model
functions/                Cloud Functions (own package.json)
firestore.rules  storage.rules  firestore.indexes.json  firebase.json
```

Route-group folders (`(student)` …) carry the auth + shell layout; the inner
segment (`/student`, `/supervisor`, `/hod`) gives the URL namespace so the three
`dashboard` routes never collide.

---

## Data model (Firestore)

```
users/{uid}                         role, department, (students) supervisorId, projectId
dashboard_stats/{supervisorId}      denormalised counters (Functions-written)
projects/{projectId}
  tickets/{ticketId}
  submissions/{submissionId}
    comments/{commentId}
```

- `supervisorId` on student `users` docs → fast roster queries.
- `dashboard_stats` → supervisor & HOD dashboards do **one read**, never a
  fan-out across projects.
- Composite indexes are declared up front in `firestore.indexes.json`
  (supervisorId+status+lastActivityAt, department+milestoneStatus+…,
  role+supervisorId+displayName, collection-group projectId+createdAt and
  status+createdAt for tickets/submissions).

---

## Query performance rules (enforced by `lib/firestore`)

- One exported function per query; every query carries a typed converter
  (`lib/firestore/converters.ts`) — components never touch raw snapshot data.
- List views are cursor-paginated (`startAfter`, `Page<T>` / `PageParams`) —
  **no `offset`**.
- No query inside `.map()` — denormalised fields cover list rendering.
- `onSnapshot` lives only in `lib/firestore/listeners.ts`, is attached from the
  single active view via `useLiveCollection`, and is unsubscribed on unmount.
- Dashboards read `dashboard_stats`; milestone status is recomputed by Cloud
  Functions (write-trigger + nightly schedule), never on the client.

## Loading / error / empty

Every data-fetching view renders three explicit states via `<QueryState>`:
layout-matched `Skeleton` (no layout shift), `<ErrorState>` with a **retry**
button, `<EmptyState>` with real copy. Write actions fire a `sonner` toast.

---

## Deploy

### Vercel

- Framework preset: **Next.js** (`vercel.json` pins it). Region `fra1`.
- Add all env vars for **Preview** and **Production** (table above). The service
  account key goes in the **server** scope only.
- Push → Preview deploy per branch; merge to `main` → Production.

### Firebase (rules / indexes / functions)

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
cd functions && npm install && npm run deploy   # Cloud Functions
```

---

## Converting Stitch screens

Stitch HTML is a design reference, not code to paste. For each screen: create the
route under the matching role group and rebuild it with `components/ui` +
`components/shared` + the `lib/firestore` query functions and the three
loading/error/empty states. The scaffolded pages already follow this pattern.
