import { useState } from "react";
import "./App.css";

const STORAGE_KEY = "encryption_key_metadata";

type KeyMetadata = {
  salt: string;
  verifier: string;
  iterations: number;
  encryption: string;
  keyProtection: string;
  integrity: string;
  storage: string;
  keySource: string;
  encryptedAesKey: string;
  encryptedRc4Key: string;
  rsaPublicKey: JsonWebKey;
  rsaPrivateKey: JsonWebKey;
  createdAt: string;
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function arrayBufferToHex(buffer: ArrayBuffer) {
  return bytesToHex(new Uint8Array(buffer));
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function isValidMetadata(data: unknown): data is KeyMetadata {
  if (!data || typeof data !== "object") return false;

  const metadata = data as Partial<KeyMetadata>;

  return (
    typeof metadata.salt === "string" &&
    typeof metadata.verifier === "string" &&
    typeof metadata.encryptedAesKey === "string" &&
    typeof metadata.encryptedRc4Key === "string" &&
    typeof metadata.encryption === "string" &&
    typeof metadata.keyProtection === "string" &&
    typeof metadata.integrity === "string" &&
    typeof metadata.storage === "string" &&
    typeof metadata.keySource === "string"
  );
}

function saveMetadata(metadata: KeyMetadata) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
}

function loadMetadata(): KeyMetadata | null {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved);

    if (!isValidMetadata(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function deleteMetadata() {
  localStorage.removeItem(STORAGE_KEY);
}

async function generateKeyFromPassword(password: string) {
  const encoder = new TextEncoder();

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    passwordKey,
    512
  );

  const derivedBytes = new Uint8Array(derivedBits);

  const aesKey = derivedBytes.slice(0, 32);
  const rc4Key = derivedBytes.slice(32, 64);

  const rsaKeyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const encryptedAesKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    rsaKeyPair.publicKey,
    aesKey
  );

  const encryptedRc4Key = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    rsaKeyPair.publicKey,
    rc4Key
  );

  const verifierBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(bytesToHex(aesKey) + bytesToHex(rc4Key))
  );

  const rsaPublicKey = await crypto.subtle.exportKey("jwk", rsaKeyPair.publicKey);
  const rsaPrivateKey = await crypto.subtle.exportKey(
    "jwk",
    rsaKeyPair.privateKey
  );

  const metadata: KeyMetadata = {
    salt: bytesToHex(salt),
    verifier: arrayBufferToHex(verifierBuffer),
    iterations,
    encryption: "AES + RC4",
    keyProtection: "RSA",
    integrity: "SHA-256",
    storage: "Local Storage",
    keySource: "Password-Based",
    encryptedAesKey: arrayBufferToBase64(encryptedAesKey),
    encryptedRc4Key: arrayBufferToBase64(encryptedRc4Key),
    rsaPublicKey,
    rsaPrivateKey,
    createdAt: new Date().toISOString(),
  };

  saveMetadata(metadata);

  return metadata;
}

function App() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [metadata, setMetadata] = useState<KeyMetadata | null>(loadMetadata);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      const result = await generateKeyFromPassword(password);

      setMetadata(result);
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Gagal membuat encryption key.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetKey = () => {
    deleteMetadata();
    setMetadata(null);
    setPassword("");
    setConfirmPassword("");
    setError("");
  };

  return (
    <main className="page">
      <section className="login-card">
        {!metadata ? (
          <>
            <div className="card-header">
              <div className="logo-box">🔐</div>

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
              Metadata dan encrypted key tersimpan di browser untuk proses
              enkripsi file.
            </p>

            <div className="metadata-box">
              <div>
                <span>Storage</span>
                <strong>{metadata.storage}</strong>
              </div>

              <div>
                <span>Encryption</span>
                <strong>{metadata.encryption}</strong>
              </div>

              <div>
                <span>Key Protection</span>
                <strong>{metadata.keyProtection}</strong>
              </div>

              <div>
                <span>Integrity</span>
                <strong>{metadata.integrity}</strong>
              </div>
            </div>

            <button className="danger" onClick={handleResetKey}>
              Reset Key
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;