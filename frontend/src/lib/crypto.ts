import { getConfig } from './db/config'
import CryptoJS from 'crypto-js'

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

function wordArrayToArrayBuffer(wa: CryptoJS.lib.WordArray): ArrayBuffer {
  const length = wa.sigBytes
  const bytes = new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    bytes[i] = (wa.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
  }
  return bytes.buffer
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export async function deriveKeysFromConfig(config: {
  rsa_private_key: string
  encrypted_aes_key: string
  encrypted_rc4_key: string
}): Promise<{ aesKey: CryptoJS.lib.WordArray; rc4Key: CryptoJS.lib.WordArray }> {
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(config.rsa_private_key),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  )

  const aesKeyRaw = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    base64ToArrayBuffer(config.encrypted_aes_key)
  )

  const rc4KeyRaw = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    base64ToArrayBuffer(config.encrypted_rc4_key)
  )

  return {
    aesKey: arrayBufferToWordArray(aesKeyRaw),
    rc4Key: arrayBufferToWordArray(rc4KeyRaw),
  }
}

export async function encryptWithKeys(
  plaintext: ArrayBuffer,
  aesKey: CryptoJS.lib.WordArray,
  rc4Key: CryptoJS.lib.WordArray
): Promise<ArrayBuffer> {
  const iv = CryptoJS.lib.WordArray.random(16)
  const plaintextWA = arrayBufferToWordArray(plaintext)

  const aesResult = CryptoJS.AES.encrypt(plaintextWA, aesKey, { iv })
  const rc4Result = CryptoJS.RC4.encrypt(aesResult.ciphertext, rc4Key)

  const ivBytes = wordArrayToArrayBuffer(iv)
  const cipherBytes = wordArrayToArrayBuffer(rc4Result.ciphertext)

  const combined = new Uint8Array(ivBytes.byteLength + cipherBytes.byteLength)
  combined.set(new Uint8Array(ivBytes), 0)
  combined.set(new Uint8Array(cipherBytes), ivBytes.byteLength)

  return combined.buffer
}

export async function decryptWithKeys(
  data: ArrayBuffer,
  aesKey: CryptoJS.lib.WordArray,
  rc4Key: CryptoJS.lib.WordArray
): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(data)
  const ivBytes = bytes.slice(0, 16)
  const cipherBytes = bytes.slice(16)

  const iv = arrayBufferToWordArray(ivBytes.buffer)
  const ciphertextWA = arrayBufferToWordArray(cipherBytes.buffer)

  const rc4Params = CryptoJS.lib.CipherParams.create({ ciphertext: ciphertextWA })
  const rc4Result = CryptoJS.RC4.decrypt(rc4Params, rc4Key)

  const aesParams = CryptoJS.lib.CipherParams.create({ ciphertext: rc4Result })
  const plaintextWA = CryptoJS.AES.decrypt(aesParams, aesKey, { iv })

  return wordArrayToArrayBuffer(plaintextWA)
}

async function getKeys(): Promise<{ aesKey: CryptoJS.lib.WordArray; rc4Key: CryptoJS.lib.WordArray }> {
  const config = await getConfig()
  if (!config) {
    throw new Error('Encryption key belum di-generate. Silakan generate key terlebih dahulu.')
  }
  return deriveKeysFromConfig(config)
}

export async function encrypt(plaintext: ArrayBuffer): Promise<ArrayBuffer> {
  const { aesKey, rc4Key } = await getKeys()
  return encryptWithKeys(plaintext, aesKey, rc4Key)
}

export async function decrypt(data: ArrayBuffer): Promise<ArrayBuffer> {
  const { aesKey, rc4Key } = await getKeys()
  return decryptWithKeys(data, aesKey, rc4Key)
}
