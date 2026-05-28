import initSqlJs, { Database } from 'sql.js'
import { SCHEMA } from './schema'

const DB_KEY = 'kda_db'
let db: Database | null = null

async function loadFromIndexedDB(): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_KEY, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('db')
    }
    request.onsuccess = () => {
      const tx = request.result.transaction('db', 'readonly')
      const store = tx.objectStore('db')
      const get = store.get('data')
      get.onsuccess = () => resolve(get.result ?? null)
      get.onerror = () => resolve(null)
    }
    request.onerror = () => resolve(null)
  })
}

async function saveToIndexedDB(data: Uint8Array): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_KEY, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('db')
    }
    request.onsuccess = () => {
      const tx = request.result.transaction('db', 'readwrite')
      const store = tx.objectStore('db')
      store.put(data, 'data')
      tx.oncomplete = () => resolve()
    }
  })
}

export async function getDb(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlJs({
    locateFile: (file) => `/node_modules/sql.js/dist/${file}`,
  })

  const saved = await loadFromIndexedDB()
  db = saved ? new SQL.Database(saved) : new SQL.Database()
  db.run(SCHEMA)

  console.log('Database siap')
  return db
}

export async function saveDb(): Promise<void> {
  if (!db) return
  const data = db.export()
  await saveToIndexedDB(data)
}