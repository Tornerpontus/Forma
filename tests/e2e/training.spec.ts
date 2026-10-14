import { expect, test } from '@playwright/test'
import { logIn, logOut, signUp, tab, uniqueEmail, waitSaved } from './helpers'

test('two people can train independently: programs, logging, persistence, history, progress', async ({ page }) => {
  const anna = uniqueEmail('anna')
  const bertil = uniqueEmail('bertil')

  // --- Anna signs up and creates a program from the PPL template
  await signUp(page, 'Anna', anna)
  await tab(page, 'Program').click()
  await page.getByTestId('new-program').click()
  await page.getByLabel('Namn').fill('Annas PPL')
  await page.getByRole('button', { name: /Push \/ Pull \/ Ben/ }).click()
  await page.getByRole('button', { name: 'Skapa program' }).click()
  await expect(page.getByRole('heading', { name: 'Annas PPL' })).toBeVisible()
  await expect(page.getByText('Bänkpress')).toBeVisible()

  // --- Anna creates a custom exercise
  await page.goto('/exercises')
  await page.getByRole('button', { name: 'Egen' }).click()
  const dlg = page.getByRole('dialog', { name: 'Ny övning' })
  await dlg.getByLabel('Namn').fill('Annas kabelpress')
  await dlg.getByLabel('Muskelgrupp').selectOption('chest')
  await dlg.getByLabel('Utrustning').selectOption('cable')
  await dlg.getByRole('button', { name: 'Skapa övning' }).click()
  await expect(page.getByRole('link', { name: /Annas kabelpress/ })).toBeVisible()

  // --- Start Push from the home screen
  await tab(page, 'Träna').click()
  await page.getByTestId('start-template').filter({ hasText: 'Push' }).click()
  await expect(page.getByTestId('workout-name')).toHaveText('Push')
  const bench = page.getByTestId('exercise-block').filter({ hasText: 'Bänkpress' })
  await expect(bench).toBeVisible()

  // warm-up 1 + 3 working sets planned
  await expect(bench.getByTestId('set-row')).toHaveCount(5)
  await bench.getByLabel('Vikt set U').first().fill('40')
  await bench.getByLabel('Reps set U').first().fill('10')
  await bench.getByRole('button', { name: 'Markera set U som klart' }).first().click()
  await bench.getByLabel('Vikt set 1').fill('60')
  await bench.getByLabel('Reps set 1').fill('8')
  await bench.getByRole('button', { name: 'Markera set 1 som klart' }).click()
  // Rest timer starts automatically
  await expect(page.getByRole('timer')).toBeVisible()
  await page.getByRole('button', { name: 'Stäng vilotimer' }).click()
  await bench.getByLabel('Vikt set 2').fill('57,5')
  await bench.getByLabel('Reps set 2').fill('7')
  await bench.getByRole('button', { name: 'Markera set 2 som klart' }).click()

  // --- Crash recovery: reload the page mid-workout
  await waitSaved(page)
  await page.reload()
  const benchAfter = page.getByTestId('exercise-block').filter({ hasText: 'Bänkpress' })
  await expect(benchAfter.getByLabel('Vikt set 2')).toHaveValue('57,5')
  await expect(benchAfter.getByRole('button', { name: 'Ångra set 1' })).toBeVisible()

  // Closing the tab entirely and coming back (new page, same session)
  const page2 = await page.context().newPage()
  await page.close()
  await page2.goto('/')
  await expect(page2.getByTestId('resume-workout')).toBeVisible()
  await page2.getByTestId('resume-workout').click()
  const p = page2

  // --- Add the custom exercise during the workout
  await p.getByRole('button', { name: 'Lägg till övning' }).click()
  await p.getByLabel('Sök övning').fill('annas kabel')
  await p.getByRole('button', { name: /Annas kabelpress/ }).click()
  await p.getByRole('button', { name: /Lägg till 1 övning/ }).click()
  const cable = p.getByTestId('exercise-block').filter({ hasText: 'Annas kabelpress' })
  await cable.getByLabel('Vikt set 1').fill('25')
  await cable.getByLabel('Reps set 1').fill('12')
  await cable.getByRole('button', { name: 'Markera set 1 som klart' }).click()

  // --- Finish
  await p.getByRole('button', { name: 'Avsluta' }).click()
  await p.getByRole('button', { name: 'Spara passet' }).click()
  await expect(p.getByText('Bra jobbat!')).toBeVisible()
  await expect(p.getByTestId('detail-exercise')).toHaveCount(2)
  await expect(p.getByTestId('detail-exercise').first()).toContainText('60 kg × 8')

  // --- History lists it
  await tab(p, 'Historik').click()
  await expect(p.getByTestId('history-item')).toHaveCount(1)
  await p.getByTestId('history-item').first().click()
  await expect(p.getByTestId('workout-title')).toHaveText('Push')

  // --- Second Push: previous performance is shown and one tap repeats it
  await tab(p, 'Träna').click()
  await p.getByTestId('start-template').filter({ hasText: 'Push' }).click()
  const bench2 = p.getByTestId('exercise-block').filter({ hasText: 'Bänkpress' })
  await expect(bench2.getByTestId('previous-performance')).toContainText('60 kg × 8')
  await expect(bench2.getByLabel('Vikt set 1')).toHaveAttribute('placeholder', '60')
  await bench2.getByRole('button', { name: 'Markera set 1 som klart' }).click()
  await expect(bench2.getByLabel('Vikt set 1')).toHaveValue('60')
  await expect(bench2.getByLabel('Reps set 1')).toHaveValue('8')
  await bench2.getByLabel('Vikt set 2').fill('65')
  await bench2.getByLabel('Reps set 2').fill('6')
  await bench2.getByRole('button', { name: 'Markera set 2 som klart' }).click()
  await p.getByRole('button', { name: 'Avsluta' }).click()
  await p.getByRole('button', { name: 'Spara passet' }).click()
  await expect(p.getByText('Bra jobbat!')).toBeVisible()
  // New heaviest weight → PR
  await expect(p.getByText('Tyngsta vikt').first()).toBeVisible()

  // --- Progress uses the stored data
  await tab(p, 'Progress').click()
  await expect(p.getByTestId('strength-chart').locator('svg path.recharts-line-curve').first()).toBeVisible()
  await p.goto('/exercises')
  await p.getByLabel('Sök övning').fill('Bänkpress')
  await p.getByRole('link', { name: /^Bänkpress/ }).first().click()
  await expect(p.getByText('Personliga rekord')).toBeVisible()
  await expect(p.getByText('65 kg').first()).toBeVisible()
  await expect(p.getByText('All historik · 2 pass')).toBeVisible()

  // --- Bertil signs up: sees none of Anna's data
  await p.goto('/')
  await logOut(p)
  await signUp(p, 'Bertil', bertil)
  await tab(p, 'Historik').click()
  await expect(p.getByText('Inga pass än')).toBeVisible()
  await tab(p, 'Program').click()
  await expect(p.getByText('Inga program än')).toBeVisible()
  await p.goto('/exercises')
  await p.getByLabel('Sök övning').fill('Annas')
  await expect(p.getByText('Inga övningar matchar.')).toBeVisible()

  // Bertil logs his own workout
  await tab(p, 'Träna').click()
  await p.getByTestId('start-empty').click()
  await p.getByRole('button', { name: 'Lägg till övning' }).first().click()
  await p.getByLabel('Sök övning').fill('knäböj')
  await p.getByRole('button', { name: /^Knäböj/ }).first().click()
  await p.getByRole('button', { name: /Lägg till 1 övning/ }).click()
  const squat = p.getByTestId('exercise-block').filter({ hasText: 'Knäböj' })
  await squat.getByLabel('Vikt set 1').fill('100')
  await squat.getByLabel('Reps set 1').fill('5')
  await squat.getByRole('button', { name: 'Markera set 1 som klart' }).click()
  await p.getByRole('button', { name: 'Avsluta' }).click()
  await p.getByRole('button', { name: 'Spara passet' }).click()
  await expect(p.getByText('Bra jobbat!')).toBeVisible()

  // --- Anna logs back in: her data is intact and Bertil's isn't there
  await p.goto('/')
  await logOut(p)
  await logIn(p, anna)
  await tab(p, 'Historik').click()
  await expect(p.getByTestId('history-item')).toHaveCount(2)
  await expect(p.getByText('Knäböj')).toHaveCount(0)
})
