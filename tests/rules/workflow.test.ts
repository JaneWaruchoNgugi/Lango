import { afterAll, beforeAll, describe, it, expect } from 'vitest'
import { assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { makeEnv, guardA, caretakerA } from './setup'

let env: RulesTestEnvironment
beforeAll(async () => { env = await makeEnv() })
afterAll(async () => { await env.cleanup() })

describe('guest workflow', () => {
  it('service provider registration persists serviceType and is visible to caretaker', async () => {
    const gdb = env.authenticatedContext('gA', guardA).firestore()
    await assertSucceeds(setDoc(doc(gdb, 'visitors/vSvc'), {
      propertyId: 'propA', registeredBy: 'gA', status: 'INSIDE',
      visitType: 'SERVICE_PROVIDER', serviceType: 'Internet Installation', visitorName: 'Tech Guy',
    }))
    const cdb = env.authenticatedContext('cA', caretakerA).firestore()
    const snap = await getDoc(doc(cdb, 'visitors/vSvc'))
    expect(snap.data()?.serviceType).toBe('Internet Installation')
  })
  it('guard can check a visitor out', async () => {
    const gdb = env.authenticatedContext('gA', guardA).firestore()
    await assertSucceeds(updateDoc(doc(gdb, 'visitors/vSvc'), { status: 'CHECKED_OUT', durationMinutes: 30 }))
  })
  it('delivery registration lands in deliveries', async () => {
    const gdb = env.authenticatedContext('gA', guardA).firestore()
    await assertSucceeds(setDoc(doc(gdb, 'deliveries/dX'), { propertyId: 'propA', registeredBy: 'gA', status: 'RECEIVED', company: 'DHL' }))
  })
})
