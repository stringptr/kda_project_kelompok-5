import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockEncrypt, mockUploadChunk, mockInsertFileWithChunks } = vi.hoisted(() => ({
  mockEncrypt: vi.fn((buffer: ArrayBuffer) => Promise.resolve(buffer)),
  mockUploadChunk: vi.fn(() => Promise.resolve('mock-key-1')),
  mockInsertFileWithChunks: vi.fn(() => Promise.resolve(1)),
}))

vi.mock('../crypto', () => ({
  encrypt: mockEncrypt,
}))

vi.mock('../api', () => ({
  uploadChunk: mockUploadChunk,
}))

vi.mock('../db/files', () => ({
  insertFileWithChunks: mockInsertFileWithChunks,
}))

const CHUNK_SIZE = 1 * 1024 * 1024 // 1MB

function createFile(name: string, size: number): File {
  const content = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    content[i] = i % 256
  }
  return new File([content], name, { type: 'application/octet-stream' })
}

describe('uploadFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploads file smaller than 1 chunk (single chunk)', async () => {
    const { uploadFile } = await import('../upload')
    const file = createFile('small.txt', 100)
    const progress = vi.fn()

    await uploadFile(file, progress)

    expect(mockEncrypt).toHaveBeenCalledTimes(1)
    expect(mockUploadChunk).toHaveBeenCalledTimes(1)
    expect(progress).toHaveBeenCalledWith({ current: 1, total: 1 })
  })

  it('uploads file exactly 1 chunk size', async () => {
    const { uploadFile } = await import('../upload')
    const file = createFile('exact.txt', CHUNK_SIZE)
    const progress = vi.fn()

    await uploadFile(file, progress)

    expect(mockEncrypt).toHaveBeenCalledTimes(1)
    expect(mockUploadChunk).toHaveBeenCalledTimes(1)
    expect(progress).toHaveBeenCalledWith({ current: 1, total: 1 })
  })

  it('uploads file spanning multiple chunks', async () => {
    const { uploadFile } = await import('../upload')
    const file = createFile('multi.txt', Math.ceil(CHUNK_SIZE * 2.5))
    const progress = vi.fn()

    await uploadFile(file, progress)

    expect(mockEncrypt).toHaveBeenCalledTimes(3)
    expect(mockUploadChunk).toHaveBeenCalledTimes(3)
    expect(progress).toHaveBeenNthCalledWith(1, { current: 1, total: 3 })
    expect(progress).toHaveBeenNthCalledWith(2, { current: 2, total: 3 })
    expect(progress).toHaveBeenNthCalledWith(3, { current: 3, total: 3 })
  })

  it('insertFileWithChunks receives correct file metadata', async () => {
    const { uploadFile } = await import('../upload')
    const file = createFile('metadata.txt', 500)
    const fileName = 'metadata.txt'
    Object.defineProperty(file, 'name', { value: fileName })

    await uploadFile(file, vi.fn())

    expect(mockInsertFileWithChunks).toHaveBeenCalledOnce()
    const [fileData] = mockInsertFileWithChunks.mock.calls[0]
    expect(fileData.original_name).toBe('metadata.txt')
    expect(fileData.size).toBe(500)
    expect(fileData.total_chunks).toBe(1)
    expect(fileData.hash_algorithm).toBe('SHA-256')
  })

  it('file splitting respects chunk boundaries', async () => {
    const { uploadFile } = await import('../upload')
    const file = createFile('split.txt', Math.ceil(CHUNK_SIZE * 1.5))
    const progress = vi.fn()

    await uploadFile(file, progress)

    // First encrypt call: first 1MB
    const firstCallArg = mockEncrypt.mock.calls[0][0]
    expect((firstCallArg as ArrayBuffer).byteLength).toBe(CHUNK_SIZE)

    // Second encrypt call: remaining ~0.5MB
    const secondCallArg = mockEncrypt.mock.calls[1][0]
    expect((secondCallArg as ArrayBuffer).byteLength).toBeLessThan(CHUNK_SIZE)
  })

  it('passes hash algorithm through', async () => {
    const { uploadFile } = await import('../upload')
    const file = createFile('hash-algo.txt', 100)

    await uploadFile(file, vi.fn(), 'MD5')

    expect(mockInsertFileWithChunks).toHaveBeenCalledOnce()
    const [fileData] = mockInsertFileWithChunks.mock.calls[0]
    expect(fileData.hash_algorithm).toBe('MD5')
  })

  it('propagates error from encrypt', async () => {
    mockEncrypt.mockRejectedValueOnce(new Error('Encrypt failed'))

    const { uploadFile } = await import('../upload')
    const file = createFile('error.txt', 100)

    await expect(uploadFile(file, vi.fn())).rejects.toThrow('Encrypt failed')
  })

  it('propagates error from uploadChunk', async () => {
    mockUploadChunk.mockRejectedValueOnce(new Error('Upload failed'))

    const { uploadFile } = await import('../upload')
    const file = createFile('error.txt', 100)

    await expect(uploadFile(file, vi.fn())).rejects.toThrow('Upload failed')
  })
})
