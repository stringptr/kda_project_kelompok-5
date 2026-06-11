import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const BACKEND_URL = 'http://localhost:3000'

const server = setupServer(
  http.post(`${BACKEND_URL}/upload`, async () => {
    return HttpResponse.json({ success: true, object_key: 'mock-uuid-123' })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('uploadChunk', () => {
  it('returns object_key on successful upload', async () => {
    const { uploadChunk } = await import('../api')
    const blob = new Blob(['test data'], { type: 'application/octet-stream' })
    const key = await uploadChunk(blob)
    expect(key).toBe('mock-uuid-123')
  })

  it('throws on server error response', async () => {
    server.use(
      http.post(`${BACKEND_URL}/upload`, async () => {
        return HttpResponse.json({ success: false, error: 'Server error' }, { status: 500 })
      })
    )

    const { uploadChunk } = await import('../api')
    const blob = new Blob(['test'])
    await expect(uploadChunk(blob)).rejects.toThrow('Server error')
  })

  it('throws on non-JSON response', async () => {
    server.use(
      http.post(`${BACKEND_URL}/upload`, async () => {
        return new HttpResponse('Internal Server Error', { status: 500 })
      })
    )

    const { uploadChunk } = await import('../api')
    const blob = new Blob(['test'])
    await expect(uploadChunk(blob)).rejects.toThrow()
  })

  it('throws when object_key is missing in response', async () => {
    server.use(
      http.post(`${BACKEND_URL}/upload`, async () => {
        return HttpResponse.json({ success: true })
      })
    )

    const { uploadChunk } = await import('../api')
    const blob = new Blob(['test'])
    const key = await uploadChunk(blob)
    expect(key).toBeUndefined()
  })
})
