import { describe, it, expect } from 'vitest'
import { STRINGS } from './i18n'

function keyShape(obj: unknown): unknown {
  if (Array.isArray(obj)) return `array:${obj.length}`
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.keys(obj).sort().map(k => [k, keyShape((obj as Record<string, unknown>)[k])]))
  }
  return typeof obj
}

describe('landing i18n', () => {
  it('EN and SW have identical key structure', () => {
    expect(keyShape(STRINGS.sw)).toEqual(keyShape(STRINGS.en))
  })
  it('every array has matching length across languages', () => {
    expect(STRINGS.sw.segments).toHaveLength(STRINGS.en.segments.length)
    expect(STRINGS.sw.features).toHaveLength(STRINGS.en.features.length)
    expect(STRINGS.sw.faqs).toHaveLength(STRINGS.en.faqs.length)
    expect(STRINGS.sw.form.typeOptions).toHaveLength(STRINGS.en.form.typeOptions.length)
  })
})
