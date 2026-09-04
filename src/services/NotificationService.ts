/**
 * Lango Notification Service
 *
 * This is a service abstraction layer. In development/MVP it uses a mock
 * implementation. To plug in a real WhatsApp Business API provider (e.g.,
 * Twilio, Africa's Talking, Wati, Pindo) — replace the mock implementation
 * below with the real provider, keeping the same interface.
 *
 * NEVER put API secrets in this frontend file.
 * Actual API calls to WhatsApp providers should go through Cloud Functions.
 */

import { addDoc, serverTimestamp } from 'firebase/firestore'
import { notificationsCol } from '../firebase/collections'
import type { NotificationType } from '../types'

type NotificationPayload = {
  to: string
  type: 'VISITOR_ALERT' | 'DELIVERY_ALERT' | 'INCIDENT_ALERT'
  data: Record<string, string>
}

/**
 * Send a WhatsApp notification (mock implementation).
 * In production, this calls a Firebase Cloud Function which makes
 * the actual WhatsApp API request with secrets stored server-side.
 */
export async function sendMockWhatsApp(payload: NotificationPayload): Promise<void> {
  const message = buildMessage(payload)

  if (import.meta.env.VITE_APP_ENV === 'development') {
    // In development: log to console and simulate delay
    console.group(`📱 [MOCK WhatsApp] → ${payload.to}`)
    console.log(message)
    console.groupEnd()
    await new Promise(resolve => setTimeout(resolve, 300))
    return
  }

  // In production: call Cloud Function
  // const sendNotification = httpsCallable(functions, 'sendNotification')
  // await sendNotification({ to: payload.to, message })
}

function buildMessage(payload: NotificationPayload): string {
  const d = payload.data

  if (payload.type === 'VISITOR_ALERT') {
    return [
      '🔔 *LANGO VISITOR ALERT*',
      '',
      `A visitor has arrived at your gate.`,
      '',
      `*Visitor:* ${d.visitorName}`,
      `*Visiting:* ${d.unitNumber}`,
      `*Reason:* ${d.reason}`,
      `*ID:* ${d.idNumber}`,
      `*Type:* ${d.visitType}`,
      `*Time:* ${new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`,
      '',
      `Security has logged this visitor.`,
    ].join('\n')
  }

  if (payload.type === 'DELIVERY_ALERT') {
    return [
      '📦 *LANGO DELIVERY ALERT*',
      '',
      `A delivery has arrived for you.`,
      '',
      `*Unit:* ${d.unitNumber}`,
      `*Company:* ${d.company}`,
      `*Rider:* ${d.riderName}`,
      `*Description:* ${d.description ?? 'Not specified'}`,
      `*Time:* ${new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`,
      '',
      `Please collect at the gate.`,
    ].join('\n')
  }

  return `🔔 *LANGO ALERT*\n\nYou have a new notification from Lango Gate Management.`
}

export async function sendVisitorNotification(params: {
  propertyId: string
  type: Extract<NotificationType, 'VISITOR_ALERT' | 'DELIVERY_ALERT'>
  recipientPhone: string
  recipientName: string
  relatedEntityId: string
  data: Record<string, string>
}): Promise<void> {
  const message = buildMessage({ to: params.recipientPhone, type: params.type, data: params.data })
  await addDoc(notificationsCol, {
    propertyId: params.propertyId,
    type: params.type,
    recipientPhone: params.recipientPhone,
    recipientName: params.recipientName,
    message,
    status: 'MOCK',
    provider: 'MOCK',
    relatedEntityId: params.relatedEntityId,
    createdAt: serverTimestamp(),
  } as never)
  await sendMockWhatsApp({ to: params.recipientPhone, type: params.type, data: params.data })
}

/**
 * Future interface — plug in real provider here:
 *
 * import { sendWhatsAppViaTwilio } from './providers/twilio'
 * import { sendWhatsAppViaWati }   from './providers/wati'
 * import { sendWhatsAppViaAT }     from './providers/africasTalking'
 *
 * export const notificationProvider = sendWhatsAppViaTwilio
 */
