import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadFile, type UploadProgress } from "../lib/upload";
import type { HashAlgorithm } from "../lib/hash";
import "../App.css";

const HASH_ALGORITHM_STORAGE_KEY = "kda_hash_algorithm";

export default function Upload() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setError("");
    setSuccess(false);
    setProgress(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Pilih file terlebih dahulu.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setSuccess(false);
      
      const selectedHashAlgorithm =
        (localStorage.getItem(HASH_ALGORITHM_STORAGE_KEY) as HashAlgorithm | null) ??
        "SHA-256";

      await uploadFile(file, (p) => setProgress(p), selectedHashAlgorithm);

      setSuccess(true);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: any) {
      setError(err.message ?? "Upload gagal.");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const progressPercent = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <main className="page">
      <section className="upload-card">
        <div className="card-header">
          <h1>Upload File</h1>
          <p>File akan di-split, dienkripsi, dan diunggah ke cloud storage.</p>
        </div>

        <div className="form">
          <div className="field">
            <label>Pilih File</label>
            <input
              ref={inputRef}
              type="file"
              onChange={handleFileChange}
              disabled={loading}
            />
          </div>

          {file && (
            <div className="file-info">
              <span>{file.name}</span>
              <span>{(file.size / 1024).toFixed(1)} KB</span>
            </div>
          )}

          {progress && (
            <div className="progress-wrapper">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="progress-label">
                Mengupload chunk {progress.current} / {progress.total}
              </p>
            </div>
          )}

          {error && <p className="error">{error}</p>}

          {success && (
            <div className="result">
              <div className="success-icon">✓</div>
              <h2>Upload Berhasil</h2>
              <p>File berhasil dienkripsi dan disimpan ke cloud storage.</p>
            </div>
          )}

          <button onClick={handleUpload} disabled={loading || !file}>
            {loading ? "Mengupload..." : "Upload File"}
          </button>

          <button
            onClick={() => navigate("/download")}
            disabled={loading}
            style={{
              background: "#3f6b2c",
              color: "#fffdf5",
              boxShadow: "0 14px 28px rgba(36, 72, 23, 0.14)",
              border: "1px solid #3f6b2c",
            }}
          >
            Lihat File Download
          </button>

          <button
            onClick={() => navigate("/")}
            disabled={loading}
            style={{
              background: "transparent",
              color: "var(--green-dark)",
              boxShadow: "none",
              border: "1px solid var(--cream-border)",
            }}
          >
            ← Kembali
          </button>
        </div>
      </section>
    </main>
  );
}