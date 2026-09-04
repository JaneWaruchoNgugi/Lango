import { afterAll, beforeAll, describe, it } from 'vitest'
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc } from 'firebase/firestore'
import { makeEnv, caretakerA, guardA } from './setup'

const caretakerB = { role: 'CARETAKER', propertyId: 'propB' }

let env: RulesTestEnvironment
beforeAll(async () => {
  env = await makeEnv()
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'occupancies/oc1'), { propertyId: 'propA', unitId: 'u1', tenantId: 't1', moveOutDate: null })
    await setDoc(doc(db, 'tenants/t1'), { propertyId: 'propA', unitId: 'u1', fullName: 'Jane', status: 'ACTIVE' })
    await setDoc(doc(db, 'units/u1'), { propertyId: 'propA', status: 'OCCUPIED', currentTenantId: 't1' })
  })
})
afterAll(async () => { await env.cleanup() })

describe('caretaker occupancy + tenant boundaries', () => {
  it('caretaker A can close an occupancy in property A', async () => {
    const db = env.authenticatedContext('cA', caretakerA).firestore()
    await assertSucceeds(updateDoc(doc(db, 'occupancies/oc1'), { moveOutDate: 123 }))
  })
  it('caretaker B cannot touch property A occupancy', async () => {
    const db = env.authenticatedContext('cB', caretakerB).firestore()
    await assertFails(updateDoc(doc(db, 'occupancies/oc1'), { moveOutDate: 456 }))
  })
  it('caretaker A can move a tenant out (tenant + unit updates)', async () => {
    const db = env.authenticatedContext('cA', caretakerA).firestore()
    await assertSucceeds(updateDoc(doc(db, 'tenants/t1'), { status: 'MOVED_OUT', moveOutDate: 1 }))
    await assertSucceeds(updateDoc(doc(db, 'units/u1'), { status: 'VACANT', currentTenantId: null }))
  })
  it('guard still cannot edit tenant records (regression)', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertFails(updateDoc(doc(db, 'tenants/t1'), { fullName: 'Hacked' }))
  })
  it('guard cannot close an occupancy', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertFails(updateDoc(doc(db, 'occupancies/oc1'), { moveOutDate: 789 }))
  })
})
