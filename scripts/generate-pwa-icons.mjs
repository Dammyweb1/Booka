// scripts/generate-pwa-icons.mjs
// Run with: node scripts/generate-pwa-icons.mjs
import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const src = join(root, 'public', 'booka_logo.png')
const outDir = join(root, 'public', 'icons')

mkdirSync(outDir, { recursive: true })

const sizes = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
]

for (const { name, size } of sizes) {
  await sharp(src)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 248, g: 245, b: 240, alpha: 1 }, // Canvas #f8f5f0
    })
    .png()
    .toFile(join(outDir, name))
  console.log(`✓ Generated ${name}`)
}

// Maskable icon — adds padding so the logo isn't clipped by Android's mask
// Safe zone = 80% of icon, so we resize to 80% and pad the rest
await sharp(src)
  .resize(Math.round(512 * 0.8), Math.round(512 * 0.8), {
    fit: 'contain',
    background: { r: 212, g: 107, b: 79, alpha: 1 }, // Coral #d46b4f background
  })
  .extend({
    top: Math.round(512 * 0.1),
    bottom: Math.round(512 * 0.1),
    left: Math.round(512 * 0.1),
    right: Math.round(512 * 0.1),
    background: { r: 212, g: 107, b: 79, alpha: 1 }, // Coral #d46b4f
  })
  .png()
  .toFile(join(outDir, 'icon-maskable-512x512.png'))

console.log('✓ Generated icon-maskable-512x512.png (coral background, safe zone padded)')
console.log('\n🎉 All PWA icons generated in public/icons/')
