import CryptoJS from 'crypto-js'

export type HashAlgorithm = 'SHA-256' | 'MD5'

function arrayBufferToWordArray(buffer: ArrayBuffer): CryptoJS.lib.WordArray {
  const bytes = new Uint8Array(buffer)
  const words: number[] = []

  for (let i = 0; i < bytes.length; i += 4) {
    words.push(
      ((bytes[i] ?? 0) << 24) |
      ((bytes[i + 1] ?? 0) << 16) |
      ((bytes[i + 2] ?? 0) << 8) |
      (bytes[i + 3] ?? 0)
    )
  }

  return CryptoJS.lib.WordArray.create(words, bytes.length)
}

export function hashArrayBuffer(
  buffer: ArrayBuffer,
  algorithm: HashAlgorithm = 'SHA-256'
): string {
  const words = arrayBufferToWordArray(buffer)

  if (algorithm === 'SHA-256') {
    return CryptoJS.SHA256(words).toString(CryptoJS.enc.Hex)
  }

  return CryptoJS.MD5(words).toString(CryptoJS.enc.Hex)
}