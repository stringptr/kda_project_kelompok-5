import { describe, it, expect } from 'vitest'
import { hashArrayBuffer } from '../hash'

const encoder = new TextEncoder()

describe('hashArrayBuffer', () => {
  it('SHA-256: hello', async () => {
    const result = await hashArrayBuffer(encoder.encode('hello').buffer)
    expect(result).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
  })

  it('SHA-256: empty string', async () => {
    const result = await hashArrayBuffer(encoder.encode('').buffer)
    expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  it('SHA-256 as default algorithm', async () => {
    const explicit = await hashArrayBuffer(encoder.encode('hello').buffer, 'SHA-256')
    const defaulted = await hashArrayBuffer(encoder.encode('hello').buffer)
    expect(defaulted).toBe(explicit)
  })

  it('MD5: hello', async () => {
    const result = await hashArrayBuffer(encoder.encode('hello').buffer, 'MD5')
    expect(result).toBe('5d41402abc4b2a76b9719d911017c592')
  })

  it('MD5: empty string', async () => {
    const result = await hashArrayBuffer(encoder.encode('').buffer, 'MD5')
    expect(result).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })

  it('SHA-256: binary data (0x00..0xFF)', async () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i)
    const result = await hashArrayBuffer(bytes.buffer)
    expect(result).toBe('40aff2e9d2d8922e47afd4648e6967497158785fbd1da870e7110266bf944880')
  })

  it('MD5: binary data (0x00..0xFF)', async () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i)
    const result = await hashArrayBuffer(bytes.buffer, 'MD5')
    expect(result).toBe('e2c865db4162bed963bfaa9ef6ac18f0')
  })
})
