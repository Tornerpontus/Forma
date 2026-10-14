// Phase 2/3 screens (local dev). Usage: node scripts/screenshots2.mjs <outdir>
import { chromium } from '@playwright/test'
const out = process.argv[2]
const base = 'http://127.0.0.1:4173'
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM })
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'sv-SE' })).newPage()
const shot = async (n, full = false) => { await page.waitForTimeout(800); await page.screenshot({ path: `${out}/${n}.png`, fullPage: full }) }
await page.goto(`${base}/login`)
await page.getByLabel('E-post').fill('demo@forma.test')
await page.getByLabel('Lösenord').fill('demo-password')
await page.getByRole('button', { name: 'Logga in' }).click()
await page.getByRole('heading', { name: 'Dags att träna?' }).waitFor()
await page.goto(`${base}/nutrition`)
await shot('20-nutrition', true)
await page.getByRole('button', { name: 'Lägg till i Lunch' }).click()
await shot('21-add-food')
await page.goto(`${base}/nutrition/stats`)
await shot('22-nutrition-stats', true)
await page.goto(`${base}/body`)
await shot('23-body', true)
await page.goto(`${base}/body?view=goals`)
await shot('24-goals')
await page.goto(`${base}/`)
await shot('25-home', true)
await browser.close()
