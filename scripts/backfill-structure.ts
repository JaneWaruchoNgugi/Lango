/**
 * Optional, idempotent backfill for the flexible-structure migration.
 * - properties: set structureType='BLOCKS' where missing.
 * - units: set displayName (from unitNumber) where missing; coerce numeric
 *   floor to a string label. Never deletes.
 *
 * Prereqs:  export GOOGLE_APPLICATION_CREDENTIALS=/abs/path/serviceAccount.json
 * Run:      cd scripts && npx tsx backfill-structure.ts
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const app = initializeApp({ credential: applicationDefault() })
const db = getFirestore(app, process.env.FIRESTORE_DATABASE_ID || 'default')

async function run() {
  const props = await db.collection('properties').get()
  let p = 0
  for (const d of props.docs) {
    if (!d.data().structureType) { await d.ref.update({ structureType: 'BLOCKS' }); p++ }
  }
  console.log(`properties updated: ${p}`)

  const units = await db.collection('units').get()
  let u = 0
  for (const d of units.docs) {
    const data = d.data()
    const patch: Record<string, unknown> = {}
    if (!data.displayName && data.unitNumber) patch.displayName = data.unitNumber
    if (typeof data.floor === 'number') patch.floor = String(data.floor)
    if (Object.keys(patch).length) { await d.ref.update(patch); u++ }
  }
  console.log(`units updated: ${u}`)
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
