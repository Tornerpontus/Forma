import { expect, test } from '@playwright/test'
import { signUp, uniqueEmail, waitSaved } from './helpers'

async function startWithRun(page: import('@playwright/test').Page) {
  await page.getByTestId('start-empty').click()
  await page.getByRole('button', { name: 'Lägg till övning' }).first().click()
  await page.getByLabel('Sök övning').fill('Löpning')
  await page.getByRole('button', { name: /^Löpning/ }).first().click()
  await page.getByRole('button', { name: /Lägg till 1 övning/ }).click()
}

async function finish(page: import('@playwright/test').Page) {
  await waitSaved(page)
  await page.getByRole('button', { name: 'Avsluta' }).click()
  await page.getByRole('button', { name: 'Spara passet' }).click()
  await expect(page.getByText('Bra jobbat!')).toBeVisible()
}

test('cardio: log time and distance, see pace, repeat last session with one tap', async ({ page }) => {
  await signUp(page, 'Kim', uniqueEmail('kim'))
  await startWithRun(page)
  const block = page.getByTestId('exercise-block').first()
  await expect(block.getByLabel('Vikt set 1')).toHaveCount(0)
  await block.getByLabel('Minuter set 1').fill('25')
  await block.getByLabel('Kilometer set 1').fill('5')
  await block.getByRole('button', { name: 'Markera set 1 som klart' }).click()

  // Survives a reload mid-workout
  await waitSaved(page)
  await page.reload()
  await expect(page.getByTestId('exercise-block').first().getByLabel('Minuter set 1')).toHaveValue('25')
  await finish(page)
  const detail = page.getByTestId('detail-exercise')
  await expect(detail).toContainText('25:00 · 5 km')
  await expect(detail).toContainText('5:00 /km')

  // Next session: previous run is shown and one tap repeats it
  await page.goto('/')
  await startWithRun(page)
  const b2 = page.getByTestId('exercise-block').first()
  await expect(b2.getByTestId('previous-performance')).toContainText('25:00 · 5 km')
  await expect(b2.getByLabel('Minuter set 1')).toHaveAttribute('placeholder', '25')
  await b2.getByLabel('Kilometer set 1').fill('5,5')
  await b2.getByRole('button', { name: 'Markera set 1 som klart' }).click()
  await expect(b2.getByLabel('Minuter set 1')).toHaveValue('25')
  await finish(page)
  await expect(page.getByTestId('detail-exercise')).toContainText('25:00 · 5,5 km')

  // Exercise page shows cardio stats from real history
  await page.getByTestId('detail-exercise').getByRole('link', { name: 'Löpning' }).click()
  await expect(page.getByText('Längsta distans')).toBeVisible()
  await expect(page.getByText('5,5 km').first()).toBeVisible()
  await expect(page.getByText('All historik · 2 pass')).toBeVisible()
  await expect(page.getByTestId('cardio-chart').locator('.recharts-bar-rectangle')).toHaveCount(2)
})
