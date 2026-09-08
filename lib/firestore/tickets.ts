/** Typed query functions for `projects/{projectId}/tickets`. */
import {
  addDoc,
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { getDb } from "@/lib/firebase";
import type {
  TicketDoc,
  TicketPriority,
  TicketStatus,
} from "@/lib/types";
import { ticketConverter } from "./converters";
import { fetchPage, type Page, type PageParams } from "./pagination";
import { paths } from "./paths";

const ticketsCol = (projectId: string) =>
  collection(getDb(), paths.tickets(projectId)).withConverter(ticketConverter);

/**
 * Ticket feed for a project, newest first.
 * Composite index: (projectId collection) + createdAt desc.
 */
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

export interface CreateTicketInput {
  projectId: string;
  title: string;
  body: string;
  priority: TicketPriority;
  authorId: string;
  authorName: string;
  assigneeId?: string | null;
  dueDate?: string | null;
}

export async function createTicket(
  input: CreateTicketInput
): Promise<string> {
  const { projectId, ...rest } = input;
  const ref = await addDoc(ticketsCol(projectId), {
    projectId,
    ...rest,
    assigneeId: rest.assigneeId ?? null,
    dueDate: rest.dueDate ?? null,
    status: "open" satisfies TicketStatus,
    createdAt: serverTimestamp() as never,
    updatedAt: serverTimestamp() as never,
  } as Partial<TicketDoc>);
  return ref.id;
}

export async function updateTicketStatus(
  projectId: string,
  ticketId: string,
  status: TicketStatus
): Promise<void> {
  await updateDoc(doc(getDb(), paths.ticket(projectId, ticketId)), {
    status,
    updatedAt: serverTimestamp(),
  });
}
