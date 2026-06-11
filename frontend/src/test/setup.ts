import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

if (!globalThis.crypto?.subtle) {
  const { webcrypto } = await import('node:crypto')
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto as Crypto,
    writable: false,
  })
}

const lsStore: Record<string, string> = {}
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => lsStore[key] ?? null,
    setItem: (key: string, value: string) => { lsStore[key] = value },
    removeItem: (key: string) => { delete lsStore[key] },
    clear: () => { for (const k in lsStore) delete lsStore[k] },
    get length() { return Object.keys(lsStore).length },
    key: (i: number) => Object.keys(lsStore)[i] ?? null,
  },
  writable: false,
})
