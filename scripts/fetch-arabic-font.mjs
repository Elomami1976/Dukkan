import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const base = 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansarabic/'
await mkdir('public/fonts', { recursive: true })
const files = [['OFL.txt','OFL-NotoSansArabic.txt'], ['NotoSansArabic%5Bwdth,wght%5D.ttf','NotoSansArabic.ttf']]
const hashes = []
for (const [remote, local] of files) {
  const response = await fetch(base + remote)
  if (!response.ok) throw new Error('Font download failed: ' + response.status)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (local.endsWith('.ttf') && bytes.readUInt32BE(0) !== 0x00010000) throw new Error('Unexpected font format')
  await writeFile('public/fonts/' + local, bytes)
  hashes.push(`${createHash('sha256').update(bytes).digest('hex')}  ${local}`)
}
await writeFile('public/fonts/SOURCE.txt', `Noto Sans Arabic, unmodified variable TrueType font.\nSource: ${base}\nLicense: SIL Open Font License 1.1; see OFL-NotoSansArabic.txt.\nDownloaded: ${new Date().toISOString()}\n${hashes.join('\n')}\n`)
console.log('Downloaded local Arabic font and redistribution license.')
