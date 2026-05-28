const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000";

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