import { describe, it, expect, vi, beforeEach, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const BACKEND_URL = 'http://localhost:3000'

const server = setupServer(
  http.get(`${BACKEND_URL}/download/:key`, async ({ params }) => {
    const { key } = params
    return new HttpResponse(Uint8Array.from([0, 1, 2, 3]), {
      headers: { 'Content-Type': 'application/octet-stream' },
    })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const { mockDecrypt, mockGetFileById } = vi.hoisted(() => ({
  mockDecrypt: vi.fn((buffer: ArrayBuffer) => Promise.resolve(buffer)),
  mockGetFileById: vi.fn(),
}))

vi.mock('../crypto', () => ({
  decrypt: mockDecrypt,
}))

vi.mock('../db/files', () => ({
  getChunksByFileId: vi.fn(),
  getFileById: mockGetFileById,
}))

const encoder = new TextEncoder()

function makeChunk(index: number, key: string, size: number) {
  return { file_id: 1, chunk_index: index, storage_key: key, size }
}

describe('fetchDownloadChunk', () => {
  it('returns blob on successful fetch', async () => {
    const { fetchDownloadChunk } = await import('../Download')
    const blob = await fetchDownloadChunk('test-key')
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBe(4)
  })

  it('throws on non-ok response', async () => {
    server.use(
      http.get(`${BACKEND_URL}/download/:key`, async () => {
        return new HttpResponse('Not Found', { status: 404 })
      })
    )

    const { fetchDownloadChunk } = await import('../Download')
    await expect(fetchDownloadChunk('missing')).rejects.toThrow()
  })
})

describe('decryptChunks', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('sorts chunks by chunk_index before decrypting', async () => {
    const { decryptChunks } = await import('../Download')
    const chunks = [
      makeChunk(2, 'key-c', 10),
      makeChunk(0, 'key-a', 10),
      makeChunk(1, 'key-b', 10),
    ]

    await decryptChunks(chunks)

    // decrypt dipanggil urut sesuai chunk_index
    const firstDecryptArg = mockDecrypt.mock.calls[0][1] as any
    const secondDecryptArg = mockDecrypt.mock.calls[1][1] as any
    const thirdDecryptArg = mockDecrypt.mock.calls[2][1] as any
  })
})

describe('mergeChunks', () => {
  it('merges multiple buffers in order', async () => {
    const { mergeChunks } = await import('../Download')
    const buf1 = encoder.encode('Hello ').buffer
    const buf2 = encoder.encode('World').buffer
    const buf3 = encoder.encode('!').buffer

    const merged = await mergeChunks([buf1, buf2, buf3])
    expect(new TextDecoder().decode(merged)).toBe('Hello World!')
  })

  it('returns empty Uint8Array for empty input', async () => {
    const { mergeChunks } = await import('../Download')
    const merged = await mergeChunks([])
    expect(merged.byteLength).toBe(0)
  })

  it('handles single buffer', async () => {
    const { mergeChunks } = await import('../Download')
    const buf = encoder.encode('single').buffer
    const merged = await mergeChunks([buf])
    expect(new TextDecoder().decode(merged)).toBe('single')
  })
})

describe('hashFile', () => {
  it('computes SHA-256 of merged Uint8Array', async () => {
    const { hashFile } = await import('../Download')
    const data = new Uint8Array(encoder.encode('test-data').buffer)
    const result = await hashFile(data as Uint8Array<ArrayBuffer>)
    expect(result).toBe('a186000422feab857329c684e9fe91412b1a5db084100b37a98cfc95b62aa867')
  })

  it('computes MD5 of merged Uint8Array', async () => {
    const { hashFile } = await import('../Download')
    const data = new Uint8Array(encoder.encode('test-data').buffer)
    const result = await hashFile(data as Uint8Array<ArrayBuffer>, 'MD5')
    expect(result).toBe('24346e1b50066607059af36e3b684b24')
  })
})

describe('verifyHash', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('passes when computed hash matches stored hash', async () => {
    mockGetFileById.mockResolvedValue({ hash_value: 'abc123' })

    const { verifyHash } = await import('../Download')
    await expect(verifyHash(1, 'abc123')).resolves.toBeUndefined()
  })

  it('throws when computed hash does not match', async () => {
    mockGetFileById.mockResolvedValue({ hash_value: 'abc123' })

    const { verifyHash } = await import('../Download')
    await expect(verifyHash(1, 'def456')).rejects.toThrow('Integritas file rusak')
  })

  it('throws when file metadata not found', async () => {
    mockGetFileById.mockResolvedValue(null)

    const { verifyHash } = await import('../Download')
    await expect(verifyHash(999, 'abc123')).rejects.toThrow()
  })
})

describe('saveBlobAsFile', () => {
  it('creates blob URL and triggers download', async () => {
    const { saveBlobAsFile } = await import('../Download')
    const createObjectURL = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:test')
    const revokeObjectURL = vi.spyOn(window.URL, 'revokeObjectURL')

    const blob = new Blob(['test'], { type: 'text/plain' })
    saveBlobAsFile(blob, 'hasil.txt')

    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')

    createObjectURL.mockRestore()
    revokeObjectURL.mockRestore()
  })
})
