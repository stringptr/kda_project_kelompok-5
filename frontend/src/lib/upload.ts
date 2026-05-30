import { uploadChunk } from './api'
import { insertFile, insertChunk } from './db/files'

const CHUNK_SIZE = 1 * 1024 * 1024 // 1MB

export interface UploadProgress {
  current: number
  total: number
}

export async function uploadFile(
  file: File,
  onProgress: (progress: UploadProgress) => void
): Promise<void> {
  // Hitung hash SHA-256 file asli
  const fileBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashValue = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  // Split file menjadi chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  const storageKeys: string[] = []

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const chunk = file.slice(start, end)

    onProgress({ current: i, total: totalChunks })

    const storageKey = await uploadChunk(chunk)
    storageKeys.push(storageKey)
  }

  // Simpan metadata file ke SQLite
  const fileId = await insertFile({
    original_name: file.name,
    size: file.size,
    total_chunks: totalChunks,
    hash_value: hashValue,
    hash_algorithm: 'SHA-256',
  })

  // Simpan tiap chunk ke SQLite
  for (let i = 0; i < totalChunks; i++) {
    await insertChunk({
      file_id: fileId,
      chunk_index: i,
      storage_key: storageKeys[i],
      size: Math.min(CHUNK_SIZE, file.size - i * CHUNK_SIZE),
    })
  }
}