const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000'

export async function uploadChunk(chunk: Blob): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/upload`, {
    method: 'POST',
    body: chunk,
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error ?? 'Upload gagal')
  return data.object_key as string
}