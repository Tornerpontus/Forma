// Renders the FORMA logo to PNG icons with Playwright's Chromium.
import { chromium } from '@playwright/test'
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#0e0f11"/><g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})"><path d="M164 132h196v52H224v52h116v50H224v94h-60z" fill="#c8f560"/></g></svg>`
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? undefined })
const page = await browser.newPage()
for (const [file, size, pad] of [
  ['public/pwa-192.png', 192, 0],
  ['public/pwa-512.png', 512, 0],
  ['public/pwa-512-maskable.png', 512, 70],
  ['public/apple-touch-icon.png', 180, 20],
]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<html><body style="margin:0">${svg(pad).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`)
  await page.screenshot({ path: file, omitBackground: false })
}
await browser.close()
console.log('icons ok')
