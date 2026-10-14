import { expect, test } from '@playwright/test'
import { signUp, tab, uniqueEmail } from './helpers'

test('body: weight logging with 7-day average, target, measurements, goals and home dashboard', async ({ page }) => {
  await signUp(page, 'Dana', uniqueEmail('dana'))
  await tab(page, 'Progress').click()
  await page.getByRole('link', { name: 'Kropp & mål' }).click()

  // Two weigh-ins on different days
  const today = new Date()
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const y = new Date(today)
  y.setDate(today.getDate() - 1)
  await page.getByLabel('Datum').fill(iso(y))
  await page.getByLabel('Vikt i kg').fill('70,4')
  await page.getByRole('button', { name: 'Spara', exact: true }).click()
  await expect(page.getByText('70,4 kg').first()).toBeVisible()
  await page.getByLabel('Datum').fill(iso(today))
  await page.getByLabel('Vikt i kg').fill('69,8')
  await page.getByRole('button', { name: 'Spara', exact: true }).click()
  await expect(page.getByText('70,1 kg').first()).toBeVisible() // 7-day average
  await expect(page.getByTestId('weight-chart').locator('.recharts-line-curve')).toBeVisible()

  // Target weight
  await page.getByRole('button', { name: /Målvikt/ }).click()
  await page.getByLabel('Målvikt i kg').fill('67')
  await page.getByRole('dialog').getByRole('button', { name: 'Spara' }).click()
  await expect(page.getByText('3,1 kg kvar ner')).toBeVisible()

  // Measurements
  await page.getByRole('tab', { name: 'Mått' }).click()
  await page.getByRole('button', { name: 'Nya mått' }).click()
  await page.getByRole('dialog').getByLabel('Midja').fill('74')
  await page.getByRole('dialog').getByRole('button', { name: 'Spara' }).click()
  await expect(page.getByText('74 cm')).toBeVisible()

  // Goals
  await page.getByRole('tab', { name: 'Mål' }).click()
  await page.getByRole('button', { name: '4', exact: true }).click()
  await page.getByRole('button', { name: 'Nytt mål' }).click()
  await page.getByLabel('Sök övning').fill('Knäböj')
  await page.getByRole('button', { name: /^Knäböj/ }).first().click()
  await page.getByLabel('Målvikt').fill('80')
  await page.getByLabel('Målreps').fill('5')
  await page.getByRole('button', { name: 'Spara mål' }).click()
  await expect(page.getByTestId('strength-goal')).toContainText('Inget set med 5+ reps loggat än')

  // Home shows the dashboard
  await tab(page, 'Träna').click()
  await expect(page.getByText('0/4')).toBeVisible()
  await expect(page.getByText('Nästa mål')).toBeVisible()
  await expect(page.getByText('70,1 kg')).toBeVisible()
})
