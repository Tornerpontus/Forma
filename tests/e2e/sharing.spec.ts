import { expect, test } from '@playwright/test'
import { signUp, tab, uniqueEmail, waitSaved } from './helpers'

test('partner sharing: invite code, read-only partner view, own data stays separate, revoke', async ({ browser }) => {
  const opts = test.info().project.use
  const ctxA = await browser.newContext(opts)
  const ctxB = await browser.newContext(opts)
  const a = await ctxA.newPage()
  const b = await ctxB.newPage()

  // Alva logs a workout
  await signUp(a, 'Alva', uniqueEmail('alva'))
  await a.getByTestId('start-empty').click()
  await a.getByRole('button', { name: 'Lägg till övning' }).first().click()
  await a.getByLabel('Sök övning').fill('Knäböj')
  await a.getByRole('button', { name: /^Knäböj/ }).first().click()
  await a.getByRole('button', { name: /Lägg till 1 övning/ }).click()
  const block = a.getByTestId('exercise-block').first()
  await block.getByLabel('Vikt set 1').fill('70')
  await block.getByLabel('Reps set 1').fill('6')
  await block.getByRole('button', { name: 'Markera set 1 som klart' }).click()
  await waitSaved(a)
  await a.getByRole('button', { name: 'Avsluta' }).click()
  await a.getByRole('button', { name: 'Spara passet' }).click()
  await expect(a.getByText('Bra jobbat!')).toBeVisible()

  // Alva creates an invite code
  await tab(a, 'Profil').click()
  await a.getByRole('button', { name: 'Skapa inbjudningskod' }).click()
  const code = (await a.getByTestId('invite-code-value').innerText()).trim()
  expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/)

  // Bo sees nothing until he redeems the code
  await signUp(b, 'Bo', uniqueEmail('bo'))
  await expect(b.getByTestId('home-partner')).toHaveCount(0)
  await tab(b, 'Profil').click()
  await b.getByLabel('Har du fått en kod?').fill(code.toLowerCase())
  await b.getByRole('button', { name: 'Anslut' }).click()
  await expect(b.getByText('Du kan nu se Alvas träning')).toBeVisible()

  // Partner page with Alva's workout, read-only
  await tab(b, 'Träna').click()
  await b.getByTestId('home-partner').click()
  await expect(b.getByRole('heading', { name: 'Alva' })).toBeVisible()
  await expect(b.getByText('Knäböj').first()).toBeVisible()
  await b.getByTestId('partner-workout').first().click()
  await expect(b.getByTestId('partner-exercise')).toContainText('70 kg × 6')
  await expect(b.getByRole('button', { name: /Redigera|Ta bort/ })).toHaveCount(0)

  // Bo's own history and records stay empty
  await tab(b, 'Historik').click()
  await expect(b.getByTestId('history-item')).toHaveCount(0)

  // Alva sees who she shares with, and stops sharing
  await a.reload()
  await expect(a.getByText('Du delar med')).toBeVisible()
  await a.getByRole('button', { name: 'Sluta dela' }).click()
  await a.getByRole('dialog').getByRole('button', { name: 'Sluta dela' }).click()
  await expect(a.getByText('Delningen är avslutad')).toBeVisible()

  // Bo loses access immediately
  await b.goto('/')
  await expect(b.getByTestId('home-partner')).toHaveCount(0)
  await b.goto(`/settings`)
  await expect(b.getByText('Delar med dig')).toHaveCount(0)
  await ctxA.close()
  await ctxB.close()
})
