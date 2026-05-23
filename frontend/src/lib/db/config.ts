import { getDb, saveDb } from './index'

export interface ConfigRecord {
  rsa_public_key: string
  rsa_private_key: string
  encrypted_aes_key: string
  encrypted_rc4_key: string
}

export async function saveConfig(data: ConfigRecord) {
  const db = await getDb()
  db.run(`DELETE FROM config`)
  db.run(
    `INSERT INTO config (rsa_public_key, rsa_private_key, encrypted_aes_key, encrypted_rc4_key)
     VALUES (?, ?, ?, ?)`,
    [data.rsa_public_key, data.rsa_private_key, data.encrypted_aes_key, data.encrypted_rc4_key]
  )
  await saveDb()
}

export async function getConfig(): Promise<ConfigRecord | null> {
  const db = await getDb()
  const result = db.exec(`SELECT rsa_public_key, rsa_private_key, encrypted_aes_key, encrypted_rc4_key FROM config LIMIT 1`)
  if (result.length === 0 || result[0].values.length === 0) return null
  const [rsa_public_key, rsa_private_key, encrypted_aes_key, encrypted_rc4_key] = result[0].values[0]
  return {
    rsa_public_key: rsa_public_key as string,
    rsa_private_key: rsa_private_key as string,
    encrypted_aes_key: encrypted_aes_key as string,
    encrypted_rc4_key: encrypted_rc4_key as string,
  }
}