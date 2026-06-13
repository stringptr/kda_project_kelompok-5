import { writeFileSync } from 'node:fs'
import { hashArrayBuffer } from '../lib/hash'

const REPEAT = 30
const SIZES = [
  { label: '1 KB',    bytes: 1024 },
  { label: '10 KB',   bytes: 10 * 1024 },
  { label: '100 KB',  bytes: 100 * 1024 },
  { label: '1 MB',    bytes: 1024 * 1024 },
  { label: '10 MB',   bytes: 10 * 1024 * 1024 },
]

function generateData(size: number): ArrayBuffer {
  const bytes = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    bytes[i] = (i * 137 + 59) & 0xff
  }
  return bytes.buffer
}

function meanStdDev(vals: number[]): { mean: number; stddev: number } {
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  const stddev = Math.sqrt(vals.reduce((sq, v) => sq + (v - mean) ** 2, 0) / vals.length)
  return { mean, stddev }
}

async function runRepeated(data: ArrayBuffer, algo: 'SHA-256' | 'MD5'): Promise<number[]> {
  const durs: number[] = []
  let lastHash = ''
  for (let i = 0; i < REPEAT; i++) {
    const start = performance.now()
    const hash = hashArrayBuffer(data, algo)
    const ms = performance.now() - start
    durs.push(ms)
    lastHash = hash
  }
  console.log(`  ${algo.padEnd(9)} ${lastHash}  (${REPEAT}x iterasi)`)
  return durs
}

async function main() {
  console.log('=== PERBANDINGAN MD5 vs SHA-256 ===')
  console.log(`Iterasi: ${REPEAT}x per ukuran\n`)

  interface DisplayRow {
    Ukuran: string
    'MD5 (MB/s)': string
    'SHA-256 (MB/s)': string
    Lebih: string
  }
  const displayRows: DisplayRow[] = []

  const jsonResults: { label: string; bytes: number; md5: { ms_mean: number; ms_stddev: number; tp_mean: number; tp_stddev: number }; sha256: { ms_mean: number; ms_stddev: number; tp_mean: number; tp_stddev: number } }[] = []

  for (const { label, bytes } of SIZES) {
    console.log(`[${label}]`)
    const data = generateData(bytes)

    const md5Durs = await runRepeated(data, 'MD5')
    const shaDurs = await runRepeated(data, 'SHA-256')

    const md5 = meanStdDev(md5Durs)
    const sha = meanStdDev(shaDurs)

    const md5TPs = md5Durs.map((ms) => bytes / 1_048_576 / (ms / 1000))
    const shaTPs = shaDurs.map((ms) => bytes / 1_048_576 / (ms / 1000))

    const md5TP = meanStdDev(md5TPs)
    const shaTP = meanStdDev(shaTPs)

    const winner = md5TP.mean > shaTP.mean ? 'MD5' : 'SHA-256'

    console.log(`  MD5:     ${md5.mean.toFixed(2)} ms (±${md5.stddev.toFixed(2)})  ${md5TP.mean.toFixed(1)} ±${md5TP.stddev.toFixed(1)} MB/s`)
    console.log(`  SHA-256: ${sha.mean.toFixed(2)} ms (±${sha.stddev.toFixed(2)})  ${shaTP.mean.toFixed(1)} ±${shaTP.stddev.toFixed(1)} MB/s`)
    console.log()

    displayRows.push({
      Ukuran: label,
      'MD5 (MB/s)': `${md5TP.mean.toFixed(1)} ±${md5TP.stddev.toFixed(1)}`,
      'SHA-256 (MB/s)': `${shaTP.mean.toFixed(1)} ±${shaTP.stddev.toFixed(1)}`,
      Lebih: winner,
    })

    jsonResults.push({
      label,
      bytes,
      md5: { ms_mean: md5.mean, ms_stddev: md5.stddev, tp_mean: md5TP.mean, tp_stddev: md5TP.stddev },
      sha256: { ms_mean: sha.mean, ms_stddev: sha.stddev, tp_mean: shaTP.mean, tp_stddev: shaTP.stddev },
    })
  }

  console.log('=== RINGKASAN ===')
  console.log('Hasil setelah 30 iterasi per ukuran:\n')
  console.table(displayRows)
  console.log('SHA-256 output: 64 karakter hex')
  console.log('MD5 output:     32 karakter hex')

  const out = {
    metadata: { date: new Date().toISOString(), iterations: REPEAT, library: 'CryptoJS', algorithm: 'CryptoJS' },
    sizes: jsonResults,
  }
  writeFileSync('hash-results.json', JSON.stringify(out, null, 2))
  console.log('\n→ hash-results.json exported')
}

main()
