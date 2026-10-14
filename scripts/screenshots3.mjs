// Cardio screens (local dev, uses a fresh throwaway account). Usage: node scripts/screenshots3.mjs <outdir>
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
await page.getByTestId('start-empty').click()
for (const name of ['Roddmaskin', 'Löpning']) {
  await page.getByRole('button', { name: 'Lägg till övning' }).first().click()
  await page.getByLabel('Sök övning').fill(name)
  await page.getByRole('button', { name: new RegExp('^' + name) }).first().click()
  await page.getByRole('button', { name: /Lägg till 1 övning/ }).click()
}
const b = page.getByTestId('exercise-block').nth(1)
await b.getByLabel('Minuter set 1').fill('32,5')
await b.getByLabel('Kilometer set 1').fill('6,2')
await b.getByRole('button', { name: 'Markera set 1 som klart' }).click()
await b.scrollIntoViewIfNeeded()
await shot('30-cardio-active')
await page.getByRole('button', { name: 'Avsluta' }).click()
await page.getByRole('button', { name: 'Spara passet' }).click()
await page.getByText('Bra jobbat!').waitFor()
await shot('31-cardio-detail', true)
await page.getByTestId('detail-exercise').getByRole('link', { name: 'Löpning' }).click()
await shot('32-cardio-exercise', true)
await browser.close()
