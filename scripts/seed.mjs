/**
 * Small demo dataset. Idempotent — safe to re-run.
 *
 *   node scripts/seed.mjs           # create / refresh demo data
 *   node scripts/seed.mjs --wipe    # remove the demo data, then exit
 *
 * Reads FIREBASE_SERVICE_ACCOUNT_KEY from .env.local (or the env).
 * All demo accounts use the password:  demo1234
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  getFirestore,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WIPE = process.argv.includes("--wipe");
const PASSWORD = "demo1234";
const DEPT = "Computer Science";
const DAY = 86_400_000;

// ---- credentials / config ------------------------------------------------
function loadEnv() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) return;
  try {
    const raw = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
      }
    }
  } catch {
    /* ignore */
  }
}
loadEnv();

const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}");
if (!svc.project_id) {
  console.error("FIREBASE_SERVICE_ACCOUNT_KEY missing. Set it in .env.local.");
  process.exit(1);
}
initializeApp({
  credential: cert({
    projectId: svc.project_id,
    clientEmail: svc.client_email,
    privateKey: svc.private_key.replace(/\\n/g, "\n"),
  }),
});
const auth = getAuth();
const db = getFirestore();

// ---- pure milestone logic (mirror of lib/milestone.ts) -----------------
const T = {
  behindDaysToDefense: 45,
  stalledInactivityDays: 21,
  minTicketsPer30Days: 1,
  finalDueWindowDays: 30,
};
function milestone({ defenseDate, lastSubmission, lastActivity, tickets30, finalApproved }, now = new Date()) {
  const days = (a, b) => (a.getTime() - b.getTime()) / DAY;
  if (lastActivity && days(now, lastActivity) > T.stalledInactivityDays)
    return { status: "stalled", reason: `No activity for ${Math.floor(days(now, lastActivity))} days` };
  if (!lastActivity) return { status: "stalled", reason: "No activity recorded yet" };
  if (defenseDate) {
    const d = new Date(`${defenseDate}T23:59:59`);
    const toDef = days(d, now);
    if (toDef < 0 && !finalApproved) return { status: "behind", reason: "Defense date has passed with no approved final" };
    if (toDef >= 0 && toDef <= T.finalDueWindowDays && !finalApproved)
      return { status: "behind", reason: `Defense in ${Math.ceil(toDef)} days, final not approved` };
    if (toDef <= T.behindDaysToDefense && (!lastSubmission || days(now, lastSubmission) > T.behindDaysToDefense))
      return { status: "behind", reason: "Defense approaching with no recent submission" };
  }
  if (tickets30 < T.minTicketsPer30Days && days(now, lastActivity) > 10)
    return { status: "behind", reason: "No tickets raised in the last 30 days" };
  return { status: "on_track", reason: "On schedule" };
}

// ---- people ------------------------------------------------------------
const PEOPLE = {
  hod: { email: "hod@demo.test", name: "Dr. Bello Adeyemi", role: "hod" },
  sup1: { email: "sup1@demo.test", name: "Mrs. Ngozi Eze", role: "supervisor" },
  sup2: { email: "sup2@demo.test", name: "Mr. Tunde Bakare", role: "supervisor" },
  stu1: { email: "stu1@demo.test", name: "Ada Okafor", role: "student" },
  stu2: { email: "stu2@demo.test", name: "Emeka Obi", role: "student" },
  stu3: { email: "stu3@demo.test", name: "Zainab Musa", role: "student" },
  stu4: { email: "stu4@demo.test", name: "Chidi Nwosu", role: "student" },
};

async function ensureUser(p) {
  let rec = null;
  try {
    rec = await auth.getUserByEmail(p.email);
  } catch (e) {
    if (e?.errorInfo?.code !== "auth/user-not-found") throw e;
  }
  if (!rec) {
    try {
      rec = await auth.createUser({
        email: p.email,
        password: PASSWORD,
        displayName: p.name,
        emailVerified: true,
      });
    } catch (e) {
      if (e?.errorInfo?.code === "auth/email-already-exists") {
        rec = await auth.getUserByEmail(p.email);
      } else throw e;
    }
  }
  await auth.updateUser(rec.uid, { password: PASSWORD, displayName: p.name });
  await auth.setCustomUserClaims(rec.uid, { role: p.role, department: DEPT });
  return rec.uid;
}

async function deleteCollection(ref) {
  const snap = await ref.get();
  await Promise.all(snap.docs.map((d) => db.recursiveDelete(d.ref)));
}

// ---- projects --------------------------------------------------------
function projectSpec(uids) {
  const iso = (d) => new Date(Date.now() + d * DAY).toISOString().slice(0, 10);
  return [
    {
      id: "seed_p1",
      title: "Offline-first PWA for primary-clinic records",
      abstract:
        "A progressive web app that lets rural clinic staff capture patient encounters offline and sync when connectivity returns, with conflict resolution and role-based access.",
      studentKey: "stu1", supKey: "sup1",
      defenseDate: iso(12), progressPct: 35,
      lastSubmissionDaysAgo: 50, lastActivityDaysAgo: 3, tickets30: 1, finalApproved: false,
    },
    {
      id: "seed_p2",
      title: "CNN model for cassava crop-disease detection",
      abstract:
        "An image-classification pipeline and mobile front-end that identifies four common cassava leaf diseases from a phone photo, trained on a curated Nigerian field dataset.",
      studentKey: "stu2", supKey: "sup1",
      defenseDate: iso(58), progressPct: 62,
      lastSubmissionDaysAgo: 2, lastActivityDaysAgo: 1, tickets30: 3, finalApproved: false,
    },
    {
      id: "seed_p3",
      title: "Permissioned blockchain prototype for student-union voting",
      abstract:
        "A small Hyperledger-style permissioned ledger with a web client for casting and auditing votes, focused on verifiability and double-vote prevention.",
      studentKey: "stu3", supKey: "sup2",
      defenseDate: iso(40), progressPct: 20,
      lastSubmissionDaysAgo: 35, lastActivityDaysAgo: 30, tickets30: 0, finalApproved: false,
    },
    {
      id: "seed_p4",
      title: "IoT household energy monitor with anomaly alerts",
      abstract:
        "An ESP32-based clamp meter streaming to a dashboard that learns a household baseline and flags unusual consumption, with SMS alerts.",
      studentKey: "stu4", supKey: "sup2",
      defenseDate: iso(75), progressPct: 48,
      lastSubmissionDaysAgo: 8, lastActivityDaysAgo: 4, tickets30: 2, finalApproved: false,
    },
  ];
}

async function run() {
  console.log(WIPE ? "Wiping demo data…" : "Seeding demo data…");

  const uids = {};
  for (const [k, p] of Object.entries(PEOPLE)) uids[k] = await ensureUser(p);

  // wipe projects + subtrees either way (fresh start)
  for (const spec of projectSpec(uids)) {
    const ref = db.doc(`projects/${spec.id}`);
    if ((await ref.get()).exists) {
      for (const sub of ["tickets", "submissions"]) await deleteCollection(ref.collection(sub));
      await ref.delete();
    }
  }
  // clear notifications + activity buckets + stats for demo folks
  for (const k of Object.keys(PEOPLE)) {
    await deleteCollection(db.collection(`users/${uids[k]}/notifications`));
    await db.doc(`dashboard_stats/${uids[k]}`).delete().catch(() => {});
  }
  const day = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < 20; i++) {
    const d = new Date(Date.now() - i * DAY).toISOString().slice(0, 10);
    await db.doc(`activity_daily/${DEPT.replace(/\//g, "-")}__${d}`).delete().catch(() => {});
  }

  if (WIPE) {
    for (const k of Object.keys(PEOPLE)) {
      await db.doc(`users/${uids[k]}`).delete().catch(() => {});
      await auth.deleteUser(uids[k]).catch(() => {});
    }
    console.log("Demo data + accounts removed.");
    return;
  }

  // users/{uid}
  for (const [k, p] of Object.entries(PEOPLE)) {
    await db.doc(`users/${uids[k]}`).set({
      uid: uids[k], displayName: p.name, email: p.email, role: p.role, department: DEPT,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const now = new Date();
  const tsAgo = (d) => Timestamp.fromMillis(now.getTime() - d * DAY);

  for (const spec of projectSpec(uids)) {
    const studentId = uids[spec.studentKey];
    const supervisorId = uids[spec.supKey];
    const v = milestone({
      defenseDate: spec.defenseDate,
      lastSubmission: new Date(now.getTime() - spec.lastSubmissionDaysAgo * DAY),
      lastActivity: new Date(now.getTime() - spec.lastActivityDaysAgo * DAY),
      tickets30: spec.tickets30,
      finalApproved: spec.finalApproved,
    }, now);

    const pref = db.doc(`projects/${spec.id}`);
    await pref.set({
      title: spec.title, abstract: spec.abstract, department: DEPT,
      status: "active", milestoneStatus: v.status, milestoneReason: v.reason,
      studentId, studentName: PEOPLE[spec.studentKey].name,
      supervisorId, supervisorName: PEOPLE[spec.supKey].name,
      nextDeadline: null, defenseDate: spec.defenseDate,
      progressPct: spec.progressPct, openTicketCount: 0,
      ticketsLast30Days: spec.tickets30,
      lastSubmissionAt: tsAgo(spec.lastSubmissionDaysAgo),
      finalApproved: spec.finalApproved,
      createdAt: tsAgo(120), updatedAt: tsAgo(spec.lastActivityDaysAgo),
      lastActivityAt: tsAgo(spec.lastActivityDaysAgo),
    });
    await db.doc(`users/${studentId}`).set(
      { supervisorId, projectId: spec.id, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  }

  // a healthy back-and-forth on p2
  {
    const p = "seed_p2";
    const sup = uids.sup1, stu = uids.stu2;
    const t1 = await db.collection(`projects/${p}/tickets`).add({
      projectId: p, title: "Justify the train/val/test split",
      body: "Section 3.4 needs a paragraph on how the split avoids leakage across field sites.",
      status: "in_progress", priority: "medium",
      authorId: sup, authorName: PEOPLE.sup1.name, assigneeId: null, dueDate: null,
      createdAt: tsAgo(9), updatedAt: tsAgo(6),
    });
    const t2 = await db.collection(`projects/${p}/tickets`).add({
      projectId: p, title: "Add confusion matrix to results",
      body: "Include a normalised confusion matrix and per-class F1.",
      status: "open", priority: "high",
      authorId: sup, authorName: PEOPLE.sup1.name, assigneeId: null, dueDate: null,
      createdAt: tsAgo(3), updatedAt: tsAgo(3),
    });
    await db.collection(`projects/${p}/tickets`).add({
      projectId: p, title: "Fix data-loader shuffle seed",
      body: "Results aren't reproducible run to run — pin the seed.",
      status: "done", priority: "low",
      authorId: stu, authorName: PEOPLE.stu2.name, assigneeId: null, dueDate: null,
      createdAt: tsAgo(14), updatedAt: tsAgo(11),
    });
    const s1 = await db.collection(`projects/${p}/submissions`).add({
      projectId: p, title: "Chapter 3 — Methodology", kind: "chapter",
      status: "changes_requested", version: 1,
      storagePath: `projects/${p}/submissions/seed1/chapter3.pdf`,
      fileName: "chapter3.pdf", fileSize: 842_113,
      submittedById: stu, submittedByName: PEOPLE.stu2.name,
      commentCount: 2, firstResponseAt: tsAgo(6),
      createdAt: tsAgo(9), updatedAt: tsAgo(6),
    });
    const s2 = await db.collection(`projects/${p}/submissions`).add({
      projectId: p, title: "Chapter 4 — Results (draft)", kind: "chapter",
      status: "pending_review", version: 2,
      storagePath: `projects/${p}/submissions/seed2/chapter4.pdf`,
      fileName: "chapter4-draft.pdf", fileSize: 1_204_552,
      submittedById: stu, submittedByName: PEOPLE.stu2.name,
      commentCount: 0, firstResponseAt: null,
      createdAt: tsAgo(2), updatedAt: tsAgo(2),
    });
    await db.collection(`projects/${p}/submissions/${s1.id}/comments`).add({
      projectId: p, submissionId: s1.id, authorId: sup, authorName: PEOPLE.sup1.name,
      authorRole: "supervisor", body: "Solid start. Tighten 3.2 and address the split question, then resubmit.",
      createdAt: tsAgo(6), updatedAt: tsAgo(6),
    });
    await db.collection(`projects/${p}/submissions/${s1.id}/comments`).add({
      projectId: p, submissionId: s1.id, authorId: stu, authorName: PEOPLE.stu2.name,
      authorRole: "student", body: "Understood — pushing a revised 3.2 tomorrow.",
      createdAt: tsAgo(5), updatedAt: tsAgo(5),
    });
    await db.doc(`projects/${p}`).set({ openTicketCount: 2 }, { merge: true });
    void t1; void t2; void s2;
  }

  // one ticket on p1
  {
    const p = "seed_p1";
    await db.collection(`projects/${p}/tickets`).add({
      projectId: p, title: "Define the sync conflict-resolution rule",
      body: "Last-write-wins isn't enough for clinical records — propose a merge strategy.",
      status: "open", priority: "high",
      authorId: uids.sup1, authorName: PEOPLE.sup1.name, assigneeId: null, dueDate: null,
      createdAt: tsAgo(3), updatedAt: tsAgo(3),
    });
    await db.doc(`projects/${p}`).set({ openTicketCount: 1 }, { merge: true });
  }

  // dashboard_stats per supervisor (recompute from what we just wrote)
  for (const supKey of ["sup1", "sup2"]) {
    const sid = uids[supKey];
    const projSnap = await db.collection("projects").where("supervisorId", "==", sid).get();
    const by = { on_track: 0, behind: 0, stalled: 0 };
    let openTickets = 0, overdue = 0, pending = 0;
    const respHrs = [];
    for (const d of projSnap.docs) {
      const pr = d.data();
      by[pr.milestoneStatus] = (by[pr.milestoneStatus] || 0) + 1;
      if (pr.milestoneStatus !== "on_track") overdue++;
      openTickets += pr.openTicketCount || 0;
      const subs = await d.ref.collection("submissions").get();
      for (const s of subs.docs) {
        const sd = s.data();
        if (sd.status === "pending_review") pending++;
        if (sd.firstResponseAt && sd.createdAt)
          respHrs.push((sd.firstResponseAt.toMillis() - sd.createdAt.toMillis()) / 3_600_000);
      }
    }
    await db.doc(`dashboard_stats/${sid}`).set({
      supervisorId: sid, supervisorName: PEOPLE[supKey].name, department: DEPT,
      activeProjects: projSnap.size, overdueCount: overdue,
      pendingSubmissions: pending, openTickets,
      avgResponseHours: respHrs.length
        ? Math.round((respHrs.reduce((a, b) => a + b, 0) / respHrs.length) * 10) / 10
        : null,
      byMilestoneStatus: by,
      lastActivityAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // activity_daily — last 14 days of plausible department activity
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getTime() - i * DAY).toISOString().slice(0, 10);
    const wobble = (n) => Math.max(0, Math.round(n + (Math.random() * 2 - 1)));
    await db.doc(`activity_daily/${DEPT.replace(/\//g, "-")}__${d}`).set({
      department: DEPT, day: d,
      submissions: wobble(i % 4 === 0 ? 2 : 1),
      comments: wobble(3 - (i % 3)),
      tickets: wobble(i % 5 === 0 ? 2 : 1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  void day;

  // a couple of unread notifications for the demo student/supervisor
  await db.collection(`users/${uids.stu2}/notifications`).add({
    kind: "review", title: 'Changes requested on "Chapter 3 — Methodology"',
    href: `/student/project/seed_p2`, actorName: PEOPLE.sup1.name,
    read: false, createdAt: tsAgo(0.25),
  });
  await db.collection(`users/${uids.sup1}/notifications`).add({
    kind: "submission", title: 'Emeka Obi submitted "Chapter 4 — Results (draft)" (v2)',
    href: `/supervisor/projects/seed_p2`, actorName: PEOPLE.stu2.name,
    read: false, createdAt: tsAgo(0.1),
  });

  console.log("\nDemo data ready. Sign in with password  demo1234\n");
  console.table(
    Object.values(PEOPLE).map((p) => ({ role: p.role, email: p.email, name: p.name }))
  );
}

run().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  }
);
