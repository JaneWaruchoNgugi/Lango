import { afterAll, beforeAll, describe, it } from 'vitest'
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { makeEnv, guardA } from './setup'

let env: RulesTestEnvironment
beforeAll(async () => {
  env = await makeEnv()
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'tenants/t1'), { propertyId: 'propA', fullName: 'Jane', status: 'ACTIVE' })
    await setDoc(doc(db, 'units/u1'), { propertyId: 'propA', status: 'VACANT', currentTenantId: 't1', updatedAt: 0 })
    await setDoc(doc(db, 'visitors/vB'), { propertyId: 'propB', status: 'INSIDE' })
    await setDoc(doc(db, 'auditLogs/a1'), { propertyId: 'propA', action: 'LOGIN' })
  })
})
afterAll(async () => { await env.cleanup() })

describe('guard property isolation', () => {
  it('guard A cannot read property B visitor', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertFails(getDoc(doc(db, 'visitors/vB')))
  })
  it('guard A can create a visitor in property A with own registeredBy', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertSucceeds(setDoc(doc(db, 'visitors/vNew'), { propertyId: 'propA', registeredBy: 'gA', status: 'INSIDE' }))
  })
  it('guard A cannot forge registeredBy', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertFails(setDoc(doc(db, 'visitors/vFake'), { propertyId: 'propA', registeredBy: 'someoneElse', status: 'INSIDE' }))
  })
  it('guard A cannot edit tenant records', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertFails(updateDoc(doc(db, 'tenants/t1'), { fullName: 'Hacked' }))
  })
  it('guard A can flip unit status but not tenant fields', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertSucceeds(updateDoc(doc(db, 'units/u1'), { status: 'OCCUPIED', updatedAt: 1 }))
    await assertFails(updateDoc(doc(db, 'units/u1'), { currentTenantId: 'zzz' }))
  })
  it('nobody can modify audit logs', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertFails(updateDoc(doc(db, 'auditLogs/a1'), { action: 'TAMPER' }))
  })
  it('guard A cannot create a notification for property B', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertFails(setDoc(doc(db, 'notifications/nB'), { propertyId: 'propB', type: 'VISITOR_ALERT', recipientPhone: '0700', recipientName: 'x', message: 'm', status: 'MOCK', provider: 'MOCK' }))
  })
  it('guard A can create a notification for property A', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertSucceeds(setDoc(doc(db, 'notifications/nA'), { propertyId: 'propA', type: 'VISITOR_ALERT', recipientPhone: '0700', recipientName: 'x', message: 'm', status: 'MOCK', provider: 'MOCK' }))
  })
  it('guard A cannot forge an audit log actor', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertFails(setDoc(doc(db, 'auditLogs/forge'), { actorId: 'someoneElse', actorRole: 'SECURITY_GUARD', propertyId: 'propA', action: 'LOGIN', entityType: 'x', entityId: 'y', description: 'd' }))
  })
  it('guard A can create a well-formed audit log for itself', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertSucceeds(setDoc(doc(db, 'auditLogs/ok'), { actorId: 'gA', actorRole: 'SECURITY_GUARD', propertyId: 'propA', action: 'VISITOR_REGISTERED', entityType: 'visitor', entityId: 'v', description: 'd' }))
  })
})
