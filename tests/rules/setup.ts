import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'

export async function makeEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: 'lango-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
}

export const guardA = { role: 'SECURITY_GUARD', propertyId: 'propA' }
export const guardB = { role: 'SECURITY_GUARD', propertyId: 'propB' }
export const caretakerA = { role: 'CARETAKER', propertyId: 'propA' }
