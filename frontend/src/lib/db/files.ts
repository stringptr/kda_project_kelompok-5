import { getDb, saveDb } from './index'

export interface FileRecord {
  id: number
  original_name: string
  size: number
  total_chunks: number
  hash_value: string
  hash_algorithm: 'SHA-256' | 'MD5'
  uploaded_at: string
}

export interface ChunkRecord {
  id: number
  file_id: number
  chunk_index: number
  storage_key: string
  size: number
}

export async function insertFile(data: Omit<FileRecord, 'id' | 'uploaded_at'>) {
  const db = await getDb()
  db.run(
    `INSERT INTO files (original_name, size, total_chunks, hash_value, hash_algorithm)
     VALUES (?, ?, ?, ?, ?)`,
    [data.original_name, data.size, data.total_chunks, data.hash_value, data.hash_algorithm]
  )
  const result = db.exec(`SELECT last_insert_rowid() as id`)
  await saveDb()
  return result[0].values[0][0] as number
}

export async function insertChunk(data: Omit<ChunkRecord, 'id'>) {
  const db = await getDb()
  db.run(
    `INSERT INTO chunks (file_id, chunk_index, storage_key, size) VALUES (?, ?, ?, ?)`,
    [data.file_id, data.chunk_index, data.storage_key, data.size]
  )
  await saveDb()
}

export async function getAllFiles(): Promise<FileRecord[]> {
  const db = await getDb()
  const result = db.exec(`SELECT * FROM files ORDER BY uploaded_at DESC`)
  if (result.length === 0) return []
  const cols = result[0].columns
  return result[0].values.map((row) =>
    Object.fromEntries(cols.map((col, i) => [col, row[i]])) as unknown as FileRecord
  )
}

export async function getFileById(id: number): Promise<FileRecord | null> {
  const db = await getDb()
  const result = db.exec(`SELECT * FROM files WHERE id = ?`, [id])
  if (result.length === 0 || result[0].values.length === 0) return null
  const cols = result[0].columns
  return Object.fromEntries(cols.map((col, i) => [col, result[0].values[0][i]])) as unknown as FileRecord
}

export async function getChunksByFileId(fileId: number): Promise<ChunkRecord[]> {
  const db = await getDb()
  const result = db.exec(`SELECT * FROM chunks WHERE file_id = ? ORDER BY chunk_index ASC`, [fileId])
  if (result.length === 0) return []
  const cols = result[0].columns
  return result[0].values.map((row) =>
    Object.fromEntries(cols.map((col, i) => [col, row[i]])) as unknown as ChunkRecord
  )
}

export async function deleteFile(id: number) {
  const db = await getDb()
  db.run(`DELETE FROM chunks WHERE file_id = ?`, [id])
  db.run(`DELETE FROM files WHERE id = ?`, [id])
  await saveDb()
}