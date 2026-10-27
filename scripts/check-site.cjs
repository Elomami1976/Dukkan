const { chromium } = require('@playwright/test')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
;(async () => {
  const server = http.createServer((req, res) => {
    const file = path.join(process.cwd(), 'docs', req.url === '/' ? 'index.html' : req.url)
    res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8')
    fs.createReadStream(file).on('error', () => { res.statusCode = 404; res.end() }).pipe(res)
  }).listen(1488, '127.0.0.1')
  const browser = await chromium.launch({ channel: 'msedge' })
  try {
    const page = await browser.newPage()
    await page.route('https://api.github.com/**', route => route.fulfill({ status: 503, body: '{}' }))
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.goto('http://127.0.0.1:1488/')
      await page.locator('#updates img').scrollIntoViewIfNeeded()
      await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0))
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Horizontal overflow at ' + width)
      if (await page.locator('#updates li').count() !== 5) throw Error('Missing update features')
      await page.screenshot({ path: 'test-results/website-' + width + '.png', fullPage: true })
    }
    console.log('Website images, update content, and responsive layouts passed at 1440px and 390px.')
  } finally { await browser.close(); server.close() }
})().catch(error => { console.error(error); process.exit(1) })
