import { describe, it, expect, beforeEach } from 'vitest'
import { getDb, saveDb } from '../index'
import {
  insertFile,
  insertChunk,
  insertFileWithChunks,
  getAllFiles,
  getFileById,
  getChunksByFileId,
  deleteFile,
} from '../files'

const fileData = {
  original_name: 'test.txt',
  size: 1024,
  total_chunks: 2,
  hash_value: 'abc123',
  hash_algorithm: 'SHA-256' as const,
}

beforeEach(async () => {
  const db = await getDb()
  db.run(`DELETE FROM chunks`)
  db.run(`DELETE FROM files`)
  await saveDb()
})

describe('files CRUD', () => {
  it('insertFile returns id and getFileById retrieves it', async () => {
    const id = await insertFile(fileData)
    const result = await getFileById(id)
    expect(result).not.toBeNull()
    expect(result!.original_name).toBe('test.txt')
    expect(result!.size).toBe(1024)
    expect(result!.total_chunks).toBe(2)
    expect(result!.hash_value).toBe('abc123')
    expect(result!.hash_algorithm).toBe('SHA-256')
  })

  it('getFileById returns null for non-existent id', async () => {
    const result = await getFileById(999)
    expect(result).toBeNull()
  })

  it('getAllFiles returns empty array when no files', async () => {
    const result = await getAllFiles()
    expect(result).toEqual([])
  })

  it('getAllFiles returns all inserted files', async () => {
    const id1 = await insertFile({ ...fileData, original_name: 'a.txt' })
    const id2 = await insertFile({ ...fileData, original_name: 'b.txt' })
    const files = await getAllFiles()
    expect(files.length).toBe(2)
    const names = files.map((f) => f.original_name).sort()
    expect(names).toEqual(['a.txt', 'b.txt'])
  })
})

describe('chunks CRUD', () => {
  it('insertChunk and getChunksByFileId return ordered chunks', async () => {
    const fileId = await insertFile(fileData)
    await insertChunk({ file_id: fileId, chunk_index: 0, storage_key: 'key-0', size: 512 })
    await insertChunk({ file_id: fileId, chunk_index: 1, storage_key: 'key-1', size: 512 })

    const chunks = await getChunksByFileId(fileId)
    expect(chunks.length).toBe(2)
    expect(chunks[0].chunk_index).toBe(0)
    expect(chunks[0].storage_key).toBe('key-0')
    expect(chunks[1].chunk_index).toBe(1)
    expect(chunks[1].storage_key).toBe('key-1')
  })

  it('getChunksByFileId returns empty for non-existent file', async () => {
    const chunks = await getChunksByFileId(999)
    expect(chunks).toEqual([])
  })
})

describe('insertFileWithChunks (atomic)', () => {
  it('inserts file and chunks atomically on success', async () => {
    const chunksData = [
      { chunk_index: 0, storage_key: 'key-a', size: 400 },
      { chunk_index: 1, storage_key: 'key-b', size: 400 },
    ]

    const fileId = await insertFileWithChunks(fileData, chunksData)
    expect(fileId).toBeGreaterThan(0)

    const file = await getFileById(fileId)
    expect(file).not.toBeNull()

    const chunks = await getChunksByFileId(fileId)
    expect(chunks.length).toBe(2)
  })

  it('rolls back on failure', async () => {
    const badData = { ...fileData, original_name: null as unknown as string }

    const chunksData = [
      { chunk_index: 0, storage_key: 'key-x', size: 100 },
    ]

    await expect(insertFileWithChunks(badData, chunksData)).rejects.toThrow()

    const files = await getAllFiles()
    expect(files.length).toBe(0)
  })
})

describe('deleteFile', () => {
  it('deletes file and cascades to chunks', async () => {
    const fileId = await insertFile(fileData)
    await insertChunk({ file_id: fileId, chunk_index: 0, storage_key: 'k', size: 100 })
    await deleteFile(fileId)

    expect(await getFileById(fileId)).toBeNull()
    expect(await getChunksByFileId(fileId)).toEqual([])
  })
})
