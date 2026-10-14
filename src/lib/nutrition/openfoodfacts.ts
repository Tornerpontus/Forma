/**
 * Open Food Facts lookup (open database with many Swedish products). Runs from the user's device.
 * Only products that state energy, protein, carbohydrates and fat per 100 g are returned –
 * we never guess missing values.
 */
import type { Per100 } from './calc'

export interface OffProduct extends Per100 {
  code: string
  name: string
  brand: string
  fiber: number | null
  portion_g: number | null
}

const FIELDS = 'code,product_name,product_name_sv,brands,nutriments,serving_quantity'

interface RawProduct {
  code?: string
  product_name?: string
  product_name_sv?: string
  brands?: string
  serving_quantity?: number | string
  nutriments?: Record<string, number | string | undefined>
}

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function parseOffProduct(p: RawProduct): OffProduct | null {
  const n = p.nutriments ?? {}
  let kcal = num(n['energy-kcal_100g'])
  if (kcal == null) {
    const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g'])
    if (kj != null) kcal = Math.round((kj / 4.184) * 10) / 10
  }
  const protein = num(n['proteins_100g'])
  const carbs = num(n['carbohydrates_100g'])
  const fat = num(n['fat_100g'])
  const name = (p.product_name_sv || p.product_name || '').trim()
  if (kcal == null || protein == null || carbs == null || fat == null || !name || !p.code) return null
  if (kcal > 900 || protein + carbs + fat > 101) return null
  const portion = num(p.serving_quantity)
  return {
    code: p.code,
    name,
    brand: (p.brands ?? '').split(',')[0].trim(),
    kcal,
    protein,
    carbs,
    fat,
    fiber: num(n['fiber_100g']),
    portion_g: portion && portion > 0 && portion < 5000 ? portion : null,
  }
}

export async function searchOpenFoodFacts(query: string, signal?: AbortSignal): Promise<OffProduct[]> {
  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl')
  url.search = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '25',
    fields: FIELDS,
    lc: 'sv',
    cc: 'se',
  }).toString()
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Open Food Facts svarade ${res.status}`)
  const data = (await res.json()) as { products?: RawProduct[] }
  return (data.products ?? []).map(parseOffProduct).filter((p): p is OffProduct => p != null)
}

export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<OffProduct | null> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`, { signal })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Open Food Facts svarade ${res.status}`)
  const data = (await res.json()) as { status?: number; product?: RawProduct }
  if (!data.product || data.status === 0) return null
  return parseOffProduct({ ...data.product, code })
}
