import { expect, type Page } from '@playwright/test'

export function uniqueEmail(name: string) {
  return `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@forma.test`
}

export async function signUp(page: Page, name: string, email: string, password = 'losenord-123') {
  await page.goto('/login')
  await page.getByRole('tab', { name: 'Skapa konto' }).click()
  await page.getByLabel('Namn').fill(name)
  await page.getByLabel('E-post').fill(email)
  await page.getByLabel('Lösenord').fill(password)
  await page.getByRole('button', { name: 'Skapa konto' }).click()
  await expect(page.getByRole('heading', { name: 'Dags att träna?' })).toBeVisible()
}

export async function logIn(page: Page, email: string, password = 'losenord-123') {
  await page.goto('/login')
  await page.getByLabel('E-post').fill(email)
  await page.getByLabel('Lösenord').fill(password)
  await page.getByRole('button', { name: 'Logga in' }).click()
  await expect(page.getByRole('heading', { name: 'Dags att träna?' })).toBeVisible()
}

export async function logOut(page: Page) {
  await tab(page, 'Profil').click()
  await page.getByRole('button', { name: 'Logga ut' }).click()
  await expect(page.getByRole('button', { name: 'Logga in' })).toBeVisible()
}

/** Waits until the active workout has been saved to the server. */
export async function waitSaved(page: Page) {
  await expect(page.getByTestId('sync-state')).toHaveAttribute('data-state', 'saved', { timeout: 15_000 })
}

export function tab(page: Page, name: 'Träna' | 'Historik' | 'Kost' | 'Progress' | 'Profil') {
  return page.getByRole('navigation', { name: 'Huvudmeny' }).getByRole('link', { name, exact: true })
}
