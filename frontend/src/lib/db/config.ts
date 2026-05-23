import { getDb, saveDb } from './index'

export async function saveRsaKeypair(publicKey: string, privateKey: string) {
  const db = await getDb()
  db.run(
    `INSERT INTO config (rsa_public_key, rsa_private_key) VALUES (?, ?)`,
    [publicKey, privateKey]
  )
  await saveDb()
}

export async function getRsaKeypair() {
  const db = await getDb()
  const result = db.exec(`SELECT rsa_public_key, rsa_private_key FROM config LIMIT 1`)
  if (result.length === 0 || result[0].values.length === 0) return null
  const [publicKey, privateKey] = result[0].values[0]
  return { publicKey: publicKey as string, privateKey: privateKey as string }
}