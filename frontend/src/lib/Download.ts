import { decrypt } from "./crypto";
import { getAllFiles, getChunksByFileId, getFileById } from "../lib/db/files";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000";

interface FileItem {
  id: number;
  original_name: string;
  size: number;
  total_chunks: number;
  hash_algorithm?: string;
  hash_value?: string;
}

interface ChunkItem {
  id?: number;
  file_id: number;
  chunk_index: number;
  storage_key: string;
  size: number;
}

export async function fetchDownloadChunk(objectKey: string): Promise<Blob> {
  const response = await fetch(
    `${BACKEND_URL}/download/${encodeURIComponent(objectKey)}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error("Download chunk gagal.");
  }

  return await response.blob();
}

export async function decryptChunks(chunks: ChunkItem[]): Promise<ArrayBuffer[]> {
  const sortedChunks = [...chunks].sort(
    (a, b) => a.chunk_index - b.chunk_index
  );

  const decryptedBuffers = await Promise.all(
    sortedChunks.map(async (chunk) => {
      const blob = await fetchDownloadChunk(chunk.storage_key);
      const encryptedBuffer = await blob.arrayBuffer();
      return decrypt(encryptedBuffer);
    })
  );

  return decryptedBuffers
}
export async function mergeChunks(
  decryptedBuffers: ArrayBuffer[]
): Promise<Uint8Array<ArrayBuffer>> {
  const totalLength = decryptedBuffers.reduce(
    (sum, buf) => sum + buf.byteLength,
    0
  );
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of decryptedBuffers) {
    merged.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return merged as Uint8Array<ArrayBuffer>;
}

export async function hashFile(
  merged: Uint8Array<ArrayBufferLike>
): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    merged as unknown as BufferSource
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyHash(fileId: number, computedHash: string) {
  const fileMeta = await getFileById(fileId);
  if (computedHash !== fileMeta?.hash_value) {
    throw new Error("Integritas file rusak: hash tidak cocok!");
  }
}

export function saveBlobAsFile(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}
