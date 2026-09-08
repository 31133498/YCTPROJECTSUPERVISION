/**
 * Typed READ queries for `projects/{projectId}/tickets`. Writes go through
 * `POST /api/projects/[projectId]/tickets` (batched with project +
 * dashboard_stats counters).
 */
import { collection, orderBy, query, where } from "firebase/firestore";

import { getDb } from "@/lib/firebase";
import type { TicketDoc, TicketStatus } from "@/lib/types";
import { ticketConverter } from "./converters";
import { fetchPage, type Page, type PageParams } from "./pagination";
import { paths } from "./paths";

const ticketsCol = (projectId: string) =>
  collection(getDb(), paths.tickets(projectId)).withConverter(ticketConverter);

/** Ticket feed for a project, newest first. */
export function getTicketsPage(
  projectId: string,
  params?: PageParams
): Promise<Page<TicketDoc>> {
  const q = query(ticketsCol(projectId), orderBy("createdAt", "desc"));
  return fetchPage(q, params);
}

export function getTicketsByStatusPage(
  projectId: string,
  status: TicketStatus,
  params?: PageParams
): Promise<Page<TicketDoc>> {
  const q = query(
    ticketsCol(projectId),
    where("status", "==", status),
    orderBy("createdAt", "desc")
  );
  return fetchPage(q, params);
}
