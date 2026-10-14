import { describe, expect, it } from 'vitest'
import { parseOffProduct } from './openfoodfacts'

describe('parseOffProduct', () => {
  it('maps complete products', () => {
    const p = parseOffProduct({
      code: '7310130006056',
      product_name: 'Havregryn',
      brands: 'Kungsörnen, Lantmännen',
      nutriments: { 'energy-kcal_100g': 370, proteins_100g: 13, carbohydrates_100g: 58, fat_100g: 7, fiber_100g: 10 },
    })
    expect(p).toMatchObject({ name: 'Havregryn', brand: 'Kungsörnen', kcal: 370, fiber: 10 })
  })
  it('converts kJ when kcal is missing', () => {
    const p = parseOffProduct({ code: '1', product_name: 'X', nutriments: { 'energy-kj_100g': 1548, proteins_100g: 1, carbohydrates_100g: 1, fat_100g: 1 } })
    expect(p?.kcal).toBe(370)
  })
  it('rejects products with missing macros instead of guessing', () => {
    expect(parseOffProduct({ code: '1', product_name: 'X', nutriments: { 'energy-kcal_100g': 100, proteins_100g: 1 } })).toBeNull()
    expect(parseOffProduct({ code: '1', product_name: '', nutriments: { 'energy-kcal_100g': 100, proteins_100g: 1, carbohydrates_100g: 1, fat_100g: 1 } })).toBeNull()
  })
})
