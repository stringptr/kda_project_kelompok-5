import { describe, it, expect, beforeEach } from 'vitest'
import { getDb, saveDb } from '../index'
import { saveConfig, getConfig } from '../config'

const dummyConfig = {
  rsa_public_key: '{"kty":"RSA","n":"test-public-key"}',
  rsa_private_key: '{"kty":"RSA","n":"test-private-key"}',
  encrypted_aes_key: 'aGVhZGVyLmVuY3J5cHRlZEFlc0tleQ==',
  encrypted_rc4_key: 'aGVhZGVyLmVuY3J5cHRlZFJjNEtleQ==',
}

beforeEach(async () => {
  const db = await getDb()
  db.run(`DELETE FROM config`)
  await saveDb()
})

describe('config CRUD', () => {
  it('getConfig returns null when table is empty', async () => {
    const result = await getConfig()
    expect(result).toBeNull()
  })

  it('saveConfig then getConfig returns same data', async () => {
    await saveConfig(dummyConfig)
    const result = await getConfig()
    expect(result).not.toBeNull()
    expect(result!.rsa_public_key).toBe(dummyConfig.rsa_public_key)
    expect(result!.rsa_private_key).toBe(dummyConfig.rsa_private_key)
    expect(result!.encrypted_aes_key).toBe(dummyConfig.encrypted_aes_key)
    expect(result!.encrypted_rc4_key).toBe(dummyConfig.encrypted_rc4_key)
  })

  it('saveConfig overwrites previous config', async () => {
    await saveConfig(dummyConfig)

    const newConfig = {
      rsa_public_key: '{"kty":"RSA","n":"new-public-key"}',
      rsa_private_key: '{"kty":"RSA","n":"new-private-key"}',
      encrypted_aes_key: 'bmV3LmVuY3J5cHRlZEFlc0tleQ==',
      encrypted_rc4_key: 'bmV3LmVuY3J5cHRlZFJjNEtleQ==',
    }
    await saveConfig(newConfig)

    const result = await getConfig()
    expect(result!.rsa_public_key).toBe(newConfig.rsa_public_key)
    expect(result!.encrypted_aes_key).toBe(newConfig.encrypted_aes_key)
  })
})
