import { uploadChunk } from './api'
import { insertFile, insertChunk } from './db/files'
import { encrypt } from './crypto'
import { hashArrayBuffer, type HashAlgorithm } from './hash'

const CHUNK_SIZE = 1 * 1024 * 1024 // 1MB

export interface UploadProgress {
  current: number
  total: number
}

export async function uploadFile(
  file: File,
  onProgress: (progress: UploadProgress) => void,
  hashAlgorithm: HashAlgorithm = 'SHA-256'
): Promise<void> {
  // 1. Hash file asli sebelum split dan encrypt
  const fileBuffer = await file.arrayBuffer()
  const hashValue = await hashArrayBuffer(fileBuffer, hashAlgorithm)

  // 2. Split file menjadi chunk 1MB
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  const uploadedChunks: {
    storageKey: string
    size: number
  }[] = []

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const chunk = file.slice(start, end)

    const chunkBuffer = await chunk.arrayBuffer()

    // 3. Encrypt chunk di sisi client
    const encryptedBuffer = await encrypt(chunkBuffer)

    const encryptedBlob = new Blob([encryptedBuffer], {
      type: 'application/octet-stream',
    })

    // 4. Upload encrypted chunk ke backend/Garage
    const storageKey = await uploadChunk(encryptedBlob)

    uploadedChunks.push({
      storageKey,
      size: encryptedBlob.size,
    })

    onProgress({
      current: i + 1,
      total: totalChunks,
    })
  }

  // 5. Simpan metadata file ke SQLite
  const fileId = await insertFile({
    original_name: file.name,
    size: file.size,
    total_chunks: totalChunks,
    hash_value: hashValue,
    hash_algorithm: hashAlgorithm,
  })

  // 6. Simpan metadata chunk ke SQLite
  for (let i = 0; i < uploadedChunks.length; i++) {
    await insertChunk({
      file_id: fileId,
      chunk_index: i,
      storage_key: uploadedChunks[i].storageKey,
      size: uploadedChunks[i].size,
    })
  }
}