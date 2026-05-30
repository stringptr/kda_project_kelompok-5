import { useEffect, useState } from "react";
import "../App.css";
import { getConfig, saveConfig, type ConfigRecord } from "../lib/db/config";
import { generateKeyFromPassword } from "../lib/crypto";
import { useNavigate } from "react-router-dom";

const STORAGE_LABEL = "SQLite / LocalDB";
const ENCRYPTION_LABEL = "AES + RC4";
const KEY_PROTECTION_LABEL = "RSA";
const INTEGRITY_LABEL = "SHA-256";

export default function GenerateKey() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [config, setConfig] = useState<ConfigRecord | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadSavedKey() {
      try {
        const savedConfig = await getConfig();
        if (mounted) {
          setConfig(savedConfig);
        }
      } catch {
        if (mounted) setError("Gagal membaca key dari LocalDB.");
      } finally {
        if (mounted) setInitializing(false);
      }
    }
    loadSavedKey();
    return () => { mounted = false; };
  }, []);

  const handleGenerateKey = async () => {
    setError("");
    if (!password || !confirmPassword) {
      setError("Password dan konfirmasi password wajib diisi.");
      return;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password dan konfirmasi password tidak sama.");
      return;
    }
    try {
      setLoading(true);
      const generatedConfig = await generateKeyFromPassword(password);
      await saveConfig(generatedConfig);
      setConfig(generatedConfig);
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Gagal membuat encryption key.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNewKey = () => {
    setConfig(null);
    setPassword("");
    setConfirmPassword("");
    setError("");
  };

  if (initializing) {
    return (
      <main className="page">
        <section className="split-card">
          <aside className="visual-panel" aria-hidden="true" />
          <section className="form-panel">
            <div className="card-header">
              <h1>Loading</h1>
              <p>Memuat key dari LocalDB.</p>
            </div>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="split-card">
        <aside className="visual-panel" aria-hidden="true" />
        <section className="form-panel">
          {!config ? (
            <>
              <div className="card-header">
                <h1>Generate Key</h1>
                <p>Buat password untuk menghasilkan kunci enkripsi file.</p>
              </div>
              <div className="form">
                <div className="field">
                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Konfirmasi Password</label>
                  <input
                    type="password"
                    placeholder="Ulangi password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {error && <p className="error">{error}</p>}
                <button onClick={handleGenerateKey} disabled={loading}>
                  {loading ? "Membuat Key..." : "Generate Key"}
                </button>
              </div>
            </>
          ) : (
            <div className="result">
              <div className="success-icon">✓</div>
              <h2>Key Berhasil Dibuat</h2>
              <p>
                Encrypted key berhasil disimpan ke LocalDB dan siap digunakan
                untuk proses enkripsi file.
              </p>
              <div className="metadata-box">
                <div><span>Storage</span><strong>{STORAGE_LABEL}</strong></div>
                <div><span>Encryption</span><strong>{ENCRYPTION_LABEL}</strong></div>
                <div><span>Key Protection</span><strong>{KEY_PROTECTION_LABEL}</strong></div>
                <div><span>Integrity</span><strong>{INTEGRITY_LABEL}</strong></div>
              </div>
              {error && <p className="error">{error}</p>}
              <button className="danger" onClick={handleGenerateNewKey}>
                Generate Key Baru
              </button>
              <button onClick={() => navigate("/upload")} style={{ marginTop: 10 }}>
                Mulai Upload File →
              </button>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}