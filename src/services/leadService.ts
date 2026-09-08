import { addDoc, serverTimestamp, type WithFieldValue } from 'firebase/firestore'
import { leadsCol } from '../firebase/collections'
import { buildLeadPayload, type LeadFormValues } from '../pages/landing/leadForm'
import type { Lead } from '../types'

/** Writes a demo-request lead from the public landing form. */
export async function createLead(values: LeadFormValues): Promise<void> {
  const payload = buildLeadPayload(values)
  await addDoc(leadsCol, {
    ...payload,
    createdAt: serverTimestamp(),
  } as WithFieldValue<Omit<Lead, 'leadId'>>)
}
