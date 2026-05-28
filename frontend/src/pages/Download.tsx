import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllFiles, getChunksByFileId } from "../lib/db/files";
import { fetchDownloadChunk, saveBlobAsFile } from "../lib/Download";
import "../App.css";

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

function formatSize(size: number) {
  if (!size) return "0 KB";

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Download() {
  const navigate = useNavigate();

  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingFileId, setDownloadingFileId] = useState<number | null>(
    null
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadFiles();
  }, []);

  async function loadFiles() {
    try {
      setLoading(true);
      setMessage("");
      setError("");

      const data = await getAllFiles();
      setFiles(data as FileItem[]);
    } catch (err: any) {
      setError(err.message ?? "Gagal mengambil metadata file dari LocalDB.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(file: FileItem) {
    try {
      setDownloadingFileId(file.id);
      setMessage("");
      setError("");

      const chunks = (await getChunksByFileId(file.id)) as ChunkItem[];

      if (!chunks || chunks.length === 0) {
        throw new Error("Chunk file tidak ditemukan di LocalDB.");
      }

      const sortedChunks = [...chunks].sort(
        (a, b) => a.chunk_index - b.chunk_index
      );

      const chunkBlobs = await Promise.all(
        sortedChunks.map((chunk) => fetchDownloadChunk(chunk.storage_key))
      );

      const mergedBlob = new Blob(chunkBlobs, {
        type: "application/octet-stream",
      });

      saveBlobAsFile(mergedBlob, file.original_name);

      setMessage(`File "${file.original_name}" berhasil di-download.`);
    } catch (err: any) {
      setError(err.message ?? "Download gagal.");
    } finally {
      setDownloadingFileId(null);
    }
  }

  return (
    <main className="page">
      <section className="upload-card dl-card">
        <div className="card-header">
          <h1>Download File</h1>
          <p>
            Mengambil chunk dari backend berdasarkan metadata SQLite / LocalDB.
          </p>
        </div>

        <div className="dl-body">
          {loading && (
            <div className="dl-empty">
              <div className="dl-empty-icon">⌛</div>
              <h2>Memuat File</h2>
              <p>Sedang mengambil metadata file dari LocalDB.</p>
            </div>
          )}

          {!loading && files.length === 0 && (
            <div className="dl-empty">
              <div className="dl-empty-icon">📁</div>
              <h2>Belum Ada File</h2>
              <p>Upload file terlebih dahulu agar metadata muncul di sini.</p>
            </div>
          )}

          {!loading && files.length > 0 && (
            <div className="dl-list">
              {files.map((file) => (
                <article className="dl-item" key={file.id}>
                  <div className="dl-file-top">
                    <div className="dl-file-icon">📄</div>

                    <div className="dl-info">
                      <h2>{file.original_name}</h2>

                      <div className="dl-meta">
                        <span>{formatSize(file.size)}</span>
                        <span>{file.total_chunks} chunk</span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="dl-download-button"
                    onClick={() => handleDownload(file)}
                    disabled={downloadingFileId === file.id}
                  >
                    {downloadingFileId === file.id
                      ? "Downloading..."
                      : "Download"}
                  </button>
                </article>
              ))}
            </div>
          )}

          {message && <p className="dl-success">{message}</p>}

          {error && <p className="error">{error}</p>}

          <button
            className="dl-secondary-button"
            onClick={loadFiles}
            disabled={loading}
          >
            Refresh File
          </button>

          <button
            className="dl-secondary-button"
            onClick={() => navigate("/upload")}
          >
            ← Kembali
          </button>
        </div>
      </section>
    </main>
  );
}