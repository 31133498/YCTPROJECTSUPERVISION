/**
 * Reads of the denormalised `dashboard_stats/{supervisorId}` doc.
 *
 * Supervisor and HOD dashboards call this on load instead of aggregating live
 * across every project. The doc is refreshed by a Cloud Function write-trigger
 * (see README / functions), never recomputed on the client.
 */
import { doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { collection } from "firebase/firestore";

import { getDb } from "@/lib/firebase";
import type { DashboardStatsDoc } from "@/lib/types";
import { dashboardStatsConverter } from "./converters";
import { paths } from "./paths";

export async function getDashboardStats(
  supervisorId: string
): Promise<DashboardStatsDoc | null> {
  const snap = await getDoc(
    doc(getDb(), paths.dashboardStat(supervisorId)).withConverter(
      dashboardStatsConverter
    )
  );
  return snap.exists() ? snap.data() : null;
}

/**
 * HOD dashboard: every supervisor's rollup for a department. This reads the
 * pre-aggregated docs only (one small read per supervisor), not the projects.
 */
export async function getDepartmentDashboardStats(
  department: string
): Promise<DashboardStatsDoc[]> {
  const q = query(
    collection(getDb(), paths.dashboardStats).withConverter(
      dashboardStatsConverter
    ),
    where("department", "==", department)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}
