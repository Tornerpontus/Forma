import { expect, test } from '@playwright/test'
import { signUp, tab, uniqueEmail } from './helpers'

test('nutrition: targets, custom food, logging, edit, recipe, saved meal, stats', async ({ page }) => {
  await signUp(page, 'Cecilia', uniqueEmail('cecilia'))
  await tab(page, 'Kost').click()
  await expect(page.getByRole('heading', { name: 'Kost' })).toBeVisible()

  // Targets
  await page.getByRole('button', { name: 'Kostmål' }).click()
  const t = page.getByRole('dialog', { name: 'Dagliga mål' })
  await t.getByLabel('Mål Kcal').fill('2200')
  await t.getByLabel('Mål Protein g').fill('150')
  await t.getByRole('button', { name: 'Spara mål' }).click()
  await expect(page.getByText('av 2200 kcal')).toBeVisible()

  // Log a new custom food into breakfast
  await page.getByRole('button', { name: 'Lägg till i Frukost' }).click()
  await page.getByRole('button', { name: 'Nytt livsmedel' }).click()
  const f = page.getByRole('dialog', { name: 'Nytt livsmedel' })
  await f.getByLabel('Namn', { exact: true }).fill('Havregryn')
  await f.getByLabel('Kcal per 100 g').fill('370')
  await f.getByLabel('Protein per 100 g').fill('13')
  await f.getByLabel('Kolh. per 100 g').fill('59')
  await f.getByLabel('Fett per 100 g').fill('7')
  await f.getByRole('button', { name: 'Spara' }).click()
  const amount = page.getByRole('dialog', { name: 'Mängd' })
  await amount.getByLabel('Gram').fill('60')
  await expect(amount.getByText('222')).toBeVisible()
  await amount.getByRole('button', { name: 'Lägg till' }).click()
  await expect(page.getByTestId('kcal-total')).toHaveText('222')
  await expect(page.getByTestId('meal-breakfast')).toContainText('Havregryn')

  // Validation catches impossible values
  await page.getByRole('button', { name: 'Lägg till i Lunch' }).click()
  await page.getByRole('button', { name: 'Nytt livsmedel' }).click()
  const bad = page.getByRole('dialog', { name: 'Nytt livsmedel' })
  await bad.getByLabel('Namn', { exact: true }).fill('Fel')
  await bad.getByLabel('Kcal per 100 g').fill('100')
  await bad.getByLabel('Protein per 100 g').fill('80')
  await bad.getByLabel('Kolh. per 100 g').fill('50')
  await expect(bad.getByText(/kan inte vara mer än 100 g/)).toBeVisible()
  await expect(bad.getByRole('button', { name: 'Spara' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')

  // Edit the portion
  await page.getByTestId('meal-breakfast').getByRole('button', { name: /Havregryn/ }).click()
  await page.getByRole('dialog').getByLabel('Gram').fill('100')
  await page.getByRole('dialog').getByRole('button', { name: 'Spara' }).click()
  await expect(page.getByTestId('kcal-total')).toHaveText('370')

  // Save breakfast as a meal and re-log it into snack
  await page.getByRole('button', { name: 'Fler val för Frukost' }).click()
  await page.getByRole('button', { name: 'Spara som måltid' }).click()
  await page.getByLabel('Namn på måltiden').fill('Gröt')
  await page.getByRole('button', { name: 'Spara', exact: true }).click()
  await page.getByRole('button', { name: 'Lägg till i Mellanmål' }).click()
  await page.getByRole('tab', { name: 'Måltider' }).click()
  await page.getByRole('button', { name: /Gröt/ }).click()
  await expect(page.getByTestId('kcal-total')).toHaveText('740')

  // Recipe
  await page.goto('/nutrition/recipes/new')
  await page.getByLabel('Receptets namn').fill('Overnight oats')
  await page.getByLabel('Antal portioner').fill('2')
  await page.getByRole('button', { name: 'Lägg till ingrediens' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Havregryn/ }).click()
  await expect(page.getByText('Per portion: 185 kcal')).toBeVisible()
  await page.getByRole('button', { name: 'Spara recept' }).click()
  await expect(page.getByText('Overnight oats')).toBeVisible()

  // Stats reflect logged data
  await page.goto('/nutrition/stats')
  await expect(page.getByText('740').first()).toBeVisible()
  await expect(page.getByText('1/7')).toBeVisible()
})
