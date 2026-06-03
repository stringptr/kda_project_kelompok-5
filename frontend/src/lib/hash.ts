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

export async function hashArrayBuffer(
  buffer: ArrayBuffer,
  algorithm: HashAlgorithm = 'SHA-256'
): Promise<string> {
  if (algorithm === 'SHA-256') {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))

    return hashArray
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  }

  return CryptoJS.MD5(arrayBufferToWordArray(buffer)).toString(CryptoJS.enc.Hex)
}