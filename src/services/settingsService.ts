import { updateDoc, serverTimestamp } from 'firebase/firestore'
import { userDoc, propertyDoc } from '../firebase/collections'
import type { NotificationPreferences, PropertySettings, UserPreferences } from '../types'

export async function saveUserProfile(uid: string, data: { name?: string; phone?: string }) {
  await updateDoc(userDoc(uid), { ...data, updatedAt: serverTimestamp() })
}

export async function saveNotificationPreferences(uid: string, prefs: NotificationPreferences) {
  await updateDoc(userDoc(uid), { notificationPreferences: prefs, updatedAt: serverTimestamp() })
}

export async function saveUserPreferences(uid: string, prefs: UserPreferences) {
  await updateDoc(userDoc(uid), { preferences: prefs, updatedAt: serverTimestamp() })
}

export async function savePropertyInfo(
  propertyId: string,
  data: Partial<Pick<{ name: string; phone: string; email: string; address: string; primaryContact: string }, keyof { name: string; phone: string; email: string; address: string; primaryContact: string }>>
) {
  await updateDoc(propertyDoc(propertyId), { ...data, updatedAt: serverTimestamp() })
}

export async function savePropertySettings(propertyId: string, settings: Partial<PropertySettings>) {
  await updateDoc(propertyDoc(propertyId), { settings, updatedAt: serverTimestamp() })
}
