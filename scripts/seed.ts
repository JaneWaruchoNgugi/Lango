import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

initializeApp({ credential: applicationDefault() })
const auth = getAuth()
const db = getFirestore()

function unitNumbers(prefix: string, count: number): string[] {
  const width = Math.max(2, String(count).length)
  return Array.from({ length: count }, (_, i) => `${prefix}${String(i + 1).padStart(width, '0')}`)
}

async function ensureUser(email: string, password: string, displayName: string, claims: Record<string, unknown>) {
  let uid: string
  try {
    const u = await auth.createUser({ email, password, displayName })
    uid = u.uid
  } catch (e: any) {
    if (e?.code === 'auth/email-already-exists') {
      uid = (await auth.getUserByEmail(email)).uid
    } else { throw e }
  }
  await auth.setCustomUserClaims(uid, claims)
  return uid
}

async function main() {
  const now = FieldValue.serverTimestamp()

  // 1. Super Admin
  const adminUid = await ensureUser('admin@lango.dev', 'Lango#Admin1', 'Lango Super Admin', { role: 'SUPER_ADMIN', propertyId: null })
  await db.collection('users').doc(adminUid).set({
    uid: adminUid, name: 'Lango Super Admin', email: 'admin@lango.dev',
    role: 'SUPER_ADMIN', propertyId: null, status: 'ACTIVE', tempPasswordSet: false,
    createdAt: now, updatedAt: now,
  })

  // 2. Property
  const propertyId = 'property_greenview'
  await db.collection('properties').doc(propertyId).set({
    propertyId, name: 'Greenview Apartments', type: 'APARTMENT_BLOCK',
    address: 'Off Kiambu Road, Ruaka', county: 'Kiambu', city: 'Ruaka',
    numberOfBlocks: 4, totalUnits: 96, primaryContact: 'James Mwangi',
    phone: '+254712345678', email: 'admin@greenview.co.ke', plan: 'LARGE',
    status: 'ACTIVE', createdBy: adminUid, occupiedUnits: 0, createdAt: now, updatedAt: now,
  })

  // 3. Blocks + Units
  const blocks = [
    { name: 'Block A', prefix: 'A' }, { name: 'Block B', prefix: 'B' },
    { name: 'Block C', prefix: 'C' }, { name: 'Block D', prefix: 'D' },
  ]
  const createdUnits: { unitId: string; blockId: string; blockName: string; unitNumber: string }[] = []
  for (const b of blocks) {
    const blockRef = db.collection('blocks').doc()
    await blockRef.set({
      blockId: blockRef.id, propertyId, name: b.name, prefix: b.prefix,
      description: '', totalUnits: 24, status: 'ACTIVE', createdAt: now, updatedAt: now,
    })
    for (const unitNumber of unitNumbers(b.prefix, 24)) {
      const unitRef = db.collection('units').doc()
      await unitRef.set({
        unitId: unitRef.id, propertyId, blockId: blockRef.id, blockName: b.name,
        unitNumber, status: 'VACANT', currentTenantId: null, currentTenantName: null,
        createdAt: now, updatedAt: now,
      })
      createdUnits.push({ unitId: unitRef.id, blockId: blockRef.id, blockName: b.name, unitNumber })
    }
  }

  // 4. Tenants — occupy the first few units
  const tenantSeed = [
    { name: 'John Kamau', phone: '+254712000001' },
    { name: 'Mary Wanjiku', phone: '+254712000002' },
    { name: 'Jane Njeri', phone: '+254712000003' },
  ]
  for (let i = 0; i < tenantSeed.length; i++) {
    const unit = createdUnits[i]
    const t = tenantSeed[i]
    const tenantRef = db.collection('tenants').doc()
    await tenantRef.set({
      tenantId: tenantRef.id, propertyId, blockId: unit.blockId, unitId: unit.unitId,
      unitNumber: unit.unitNumber, blockName: unit.blockName, fullName: t.name,
      phoneNumber: t.phone, whatsappNumber: t.phone, moveInDate: now, status: 'ACTIVE',
      createdBy: adminUid, createdAt: now, updatedAt: now,
    })
    await db.collection('units').doc(unit.unitId).update({
      status: 'OCCUPIED', currentTenantId: tenantRef.id, currentTenantName: t.name, updatedAt: now,
    })
  }
  await db.collection('properties').doc(propertyId).update({ occupiedUnits: tenantSeed.length })

  // 5. Staff (caretaker + 2 guards)
  const caretakerUid = await ensureUser('caretaker@greenview.dev', 'Lango#Care1', 'Peter Otieno', { role: 'CARETAKER', propertyId })
  await db.collection('users').doc(caretakerUid).set({
    uid: caretakerUid, name: 'Peter Otieno', email: 'caretaker@greenview.dev', phone: '+254712000010',
    role: 'CARETAKER', propertyId, status: 'ACTIVE', tempPasswordSet: false, createdAt: now, updatedAt: now,
  })
  for (const g of [{ email: 'guard1@greenview.dev', name: 'David Mwangi', phone: '+254712000011' },
                   { email: 'guard2@greenview.dev', name: 'Samuel Kiptoo', phone: '+254712000012' }]) {
    const guardUid = await ensureUser(g.email, 'Lango#Guard1', g.name, { role: 'SECURITY_GUARD', propertyId })
    await db.collection('users').doc(guardUid).set({
      uid: guardUid, name: g.name, email: g.email, phone: g.phone,
      role: 'SECURITY_GUARD', propertyId, status: 'ACTIVE', tempPasswordSet: false, createdAt: now, updatedAt: now,
    })
  }

  console.log('✅ Seed complete. Super Admin: admin@lango.dev / Lango#Admin1')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
