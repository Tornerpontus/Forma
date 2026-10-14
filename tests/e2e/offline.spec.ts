import { expect, test } from '@playwright/test'
import { signUp, tab, uniqueEmail, waitSaved } from './helpers'

test('workout keeps working without connection and syncs when back online', async ({ page, context }) => {
  await signUp(page, 'Erik', uniqueEmail('erik'))
  await page.getByTestId('start-empty').click()
  await page.getByRole('button', { name: 'Lägg till övning' }).first().click()
  await page.getByLabel('Sök övning').fill('Marklyft')
  await page.getByRole('button', { name: /^Marklyft/ }).first().click()
  await page.getByRole('button', { name: /Lägg till 1 övning/ }).click()
  await waitSaved(page)

  // Connection drops in the gym
  await context.setOffline(true)
  const block = page.getByTestId('exercise-block').first()
  await block.getByLabel('Vikt set 1').fill('120')
  await block.getByLabel('Reps set 1').fill('5')
  await block.getByRole('button', { name: 'Markera set 1 som klart' }).click()
  await expect(page.getByTestId('sync-state')).toHaveAttribute('data-state', 'offline', { timeout: 10_000 })
  await block.getByRole('button', { name: 'Kopiera senaste' }).click()
  await block.getByRole('button', { name: 'Markera set 2 som klart' }).click()

  // Finishing while offline fails safely – nothing is lost
  await page.getByRole('button', { name: 'Avsluta' }).click()
  await page.getByRole('button', { name: 'Spara passet' }).click()
  await expect(page.getByText(/Kunde inte spara passet/)).toBeVisible()
  await expect(block.getByLabel('Vikt set 2')).toHaveValue('120')

  // Back online: syncs automatically, then finishes
  await context.setOffline(false)
  await waitSaved(page)
  await page.reload()
  await expect(page.getByTestId('exercise-block').first().getByLabel('Vikt set 2')).toHaveValue('120')
  await page.getByRole('button', { name: 'Avsluta' }).click()
  await page.getByRole('button', { name: 'Spara passet' }).click()
  await expect(page.getByText('Bra jobbat!')).toBeVisible()
  await expect(page.getByTestId('detail-exercise')).toContainText('120 kg × 5')
  await tab(page, 'Historik').click()
  await expect(page.getByTestId('history-item')).toHaveCount(1)
})

test('local copy wins after a crash with unsynced changes', async ({ page, context }) => {
  await signUp(page, 'Frida', uniqueEmail('frida'))
  await page.getByTestId('start-empty').click()
  await page.getByRole('button', { name: 'Lägg till övning' }).first().click()
  await page.getByLabel('Sök övning').fill('Hip thrust')
  await page.getByRole('button', { name: /^Hip thrust/ }).first().click()
  await page.getByRole('button', { name: /Lägg till 1 övning/ }).click()
  await waitSaved(page)
  // Block all Supabase writes so the next change only exists locally, then "crash" (reload)
  await context.route('**/rest/v1/workouts**', (route) => (route.request().method() === 'PATCH' ? route.abort() : route.continue()))
  const block = page.getByTestId('exercise-block').first()
  await block.getByLabel('Vikt set 1').fill('90')
  await block.getByRole('button', { name: 'Markera set 1 som klart' }).click()
  await expect(page.getByTestId('sync-state')).toHaveAttribute('data-state', 'offline', { timeout: 10_000 })
  await page.reload()
  await context.unroute('**/rest/v1/workouts**')
  await expect(page.getByTestId('exercise-block').first().getByLabel('Vikt set 1')).toHaveValue('90')
  await waitSaved(page)
})
