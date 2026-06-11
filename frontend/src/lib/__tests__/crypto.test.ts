import { describe, it, expect, beforeAll } from 'vitest'
import { saveConfig } from '../db/config'
import {
  generateKeyFromPassword,
  deriveKeysFromConfig,
  encryptWithKeys,
  decryptWithKeys,
} from '../crypto'

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

describe('crypto', () => {
  let config: any

  beforeAll(async () => {
    config = await generateKeyFromPassword('test12345678')
  })

  it('text roundtrip: encrypt then decrypt returns original', async () => {
    const keys = await deriveKeysFromConfig(config)
    const original = 'Halo dunia! 123 @#$'
    const plaintext = new TextEncoder().encode(original).buffer
    const encrypted = await encryptWithKeys(plaintext, keys.aesKey, keys.rc4Key)
    const decrypted = await decryptWithKeys(encrypted, keys.aesKey, keys.rc4Key)
    const decryptedText = new TextDecoder().decode(decrypted)

    console.log(`  Plaintext:  "${original}"`)
    console.log(`  Encrypted:  ${arrayBufferToHex(encrypted).slice(0, 64)}... (${encrypted.byteLength} bytes)`)
    console.log(`  Decrypted:  "${decryptedText}"`)

    expect(decryptedText).toBe(original)
  })

  it('IV uniqueness: same plaintext produces different ciphertext', async () => {
    const keys = await deriveKeysFromConfig(config)
    const plaintext = new TextEncoder().encode('data yang sama').buffer
    const e1 = new Uint8Array(await encryptWithKeys(plaintext, keys.aesKey, keys.rc4Key))
    const e2 = new Uint8Array(await encryptWithKeys(plaintext, keys.aesKey, keys.rc4Key))

    console.log(`  Ciphertext 1: ${arrayBufferToHex(e1.buffer).slice(0, 48)}...`)
    console.log(`  Ciphertext 2: ${arrayBufferToHex(e2.buffer).slice(0, 48)}...`)
    console.log(`  Ciphertext berbeda?: ${e1.some((v, i) => v !== e2[i]) ? 'ya' : 'tidak'}`)

    expect(e1.length).toBe(e2.length)
    expect(e1.some((v, i) => v !== e2[i])).toBe(true)
  })

  it('encrypt/decrypt top-level functions work (integration with DB)', async () => {
    await saveConfig(config)
    const { encrypt, decrypt } = await import('../crypto')
    const original = 'Encrypt via top-level function'
    const plaintext = new TextEncoder().encode(original).buffer
    const encrypted = await encrypt(plaintext)
    const decrypted = await decrypt(encrypted)

    console.log(`  Original:  "${original}"`)
    console.log(`  Decrypted: "${new TextDecoder().decode(decrypted)}"`)

    expect(new TextDecoder().decode(decrypted)).toBe(original)
  })
})
