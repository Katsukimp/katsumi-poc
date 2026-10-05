// Gera o icone do app (app.ico multi-resolucao + favicon.png) sem dependencias.
// Desenha um master 1024x1024 e reamostra por box filter para cada tamanho.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const MASTER = 1024
const SIZES = [256, 128, 64, 48, 32, 16]

// ---------- desenho ----------

/** Cobertura (0..1) de um retangulo arredondado, para antialias por distancia. */
function roundedRectCoverage(x, y, w, h, r) {
  const dx = Math.max(Math.abs(x - w / 2) - (w / 2 - r), 0)
  const dy = Math.max(Math.abs(y - h / 2) - (h / 2 - r), 0)
  const dist = Math.hypot(dx, dy) - r
  return Math.min(Math.max(0.5 - dist, 0), 1)
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function drawMaster() {
  const s = MASTER
  const px = Buffer.alloc(s * s * 4)

  // gradiente verde (mesma paleta do app)
  const top = [74, 222, 128]
  const bottom = [21, 128, 61]

  // barras estilo codigo de barras, proporcionais ao master
  const k = s / 256
  const widths = [10, 5, 14, 5, 7, 18, 5, 10].map((v) => v * k)
  const gap = 7 * k
  const totalW = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1)
  const barsX0 = (s - totalW) / 2
  const barsY0 = 84 * k
  const barsY1 = 172 * k

  const spans = []
  let cursor = barsX0
  for (const w of widths) {
    spans.push([cursor, cursor + w])
    cursor += w + gap
  }

  for (let y = 0; y < s; y++) {
    const t = y / (s - 1)
    const bg = [
      Math.round(lerp(top[0], bottom[0], t)),
      Math.round(lerp(top[1], bottom[1], t)),
      Math.round(lerp(top[2], bottom[2], t))
    ]
    for (let x = 0; x < s; x++) {
      const cov = roundedRectCoverage(x + 0.5, y + 0.5, s, s, 224)
      let [r, g, b] = bg

      // barras escuras dentro da area central
      if (y >= barsY0 && y <= barsY1) {
        const cx = x + 0.5
        if (spans.some(([a, z]) => cx >= a && cx <= z)) {
          r = 11
          g = 18
          b = 32
        }
      }

      const i = (y * s + x) * 4
      px[i] = r
      px[i + 1] = g
      px[i + 2] = b
      px[i + 3] = Math.round(cov * 255)
    }
  }
  return px
}

/** Reamostragem por media de blocos (box filter) — antialias barato e suficiente. */
function downsample(src, srcSize, dstSize) {
  const out = Buffer.alloc(dstSize * dstSize * 4)
  const ratio = srcSize / dstSize
  for (let y = 0; y < dstSize; y++) {
    for (let x = 0; x < dstSize; x++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0
      const y0 = Math.floor(y * ratio), y1 = Math.floor((y + 1) * ratio)
      const x0 = Math.floor(x * ratio), x1 = Math.floor((x + 1) * ratio)
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * srcSize + sx) * 4
          const alpha = src[i + 3] / 255
          r += src[i] * alpha
          g += src[i + 1] * alpha
          b += src[i + 2] * alpha
          a += src[i + 3]
          n++
        }
      }
      const alphaSum = a / 255
      const i = (y * dstSize + x) * 4
      out[i] = alphaSum ? Math.round(r / alphaSum) : 0
      out[i + 1] = alphaSum ? Math.round(g / alphaSum) : 0
      out[i + 2] = alphaSum ? Math.round(b / alphaSum) : 0
      out[i + 3] = Math.round(a / n)
    }
  }
  return out
}

// ---------- PNG ----------

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(px, size) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filtro none
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// ---------- ICO ----------

function encodeIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2) // tipo icone
  header.writeUInt16LE(images.length, 4)

  const entries = []
  let offset = 6 + images.length * 16
  for (const { size, png } of images) {
    const e = Buffer.alloc(16)
    e[0] = size >= 256 ? 0 : size
    e[1] = size >= 256 ? 0 : size
    e.writeUInt16LE(1, 4) // planes
    e.writeUInt16LE(32, 6) // bpp
    e.writeUInt32BE(0, 8)
    e.writeUInt32LE(png.length, 8)
    e.writeUInt32LE(offset, 12)
    entries.push(e)
    offset += png.length
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)])
}

// ---------- saida ----------

const root = join(dirname(new URL(import.meta.url).pathname.slice(1)), '..')
const master = drawMaster()
const images = SIZES.map((size) => ({
  size,
  png: encodePng(size === MASTER ? master : downsample(master, MASTER, size), size)
}))

const icoPath = join(root, 'shell', 'app.ico')
writeFileSync(icoPath, encodeIco(images))
console.log(`app.ico gerado (${SIZES.join(', ')}px) -> ${icoPath}`)

const favDir = join(root, 'frontend', 'public')
mkdirSync(favDir, { recursive: true })
const fav = images.find((i) => i.size === 256).png
writeFileSync(join(favDir, 'favicon.png'), fav)
console.log(`favicon.png gerado -> ${join(favDir, 'favicon.png')}`)
