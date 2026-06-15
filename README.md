# Improving Data Security in Cloud Storage Systems Using Hybrid Algorithms with Integrity Verification

## Anggota Kelompok 5

1. Anindya Artanti Pambudi (L0224002)
2. Aulia Rahma Bidayah (L0224003)
3. Prayuda Afifan Handoyo (L0224008)
4. Satria Manggala Putra Pratama (L0224024)
5. Rafah Taqy Arrahman (L0224047)

## Prerequisites

- **Docker** & **Docker Compose** — untuk menjalankan seluruh layanan
- **Bun** — untuk development lokal tanpa Docker

## Quick Start — Development

Menjalankan semua layanan (frontend, backend, datalake) di mesin yang sama:

```bash
cp .env.example .env
docker compose -f compose.dev.yaml up
```

- Frontend: `http://localhost:5173`
- Backend:  `http://localhost:3000`
- Datalake: `http://localhost:3900`

## Quick Start — Production (Dua Mesin)

### Server (backend + object storage)

```bash
cp .env.example .env
# edit .env sesuai konfigurasi server
docker compose -f compose.server.yaml up -d
```

### Client (frontend)

```bash
VITE_BACKEND_URL=http://<server-ip>:3000 docker compose -f compose.client.yaml up -d
```

## Project Structure

```
├── frontend/           # React + Vite (client-side encryption, UI)
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── lib/        # Crypto, hash, upload/download logic
│   │   ├── pages/      # Halaman aplikasi
│   │   └── test/       # Setup vitest, benchmark scripts
│   └── test/           # (kosong, cadangan)
├── backend/            # Elysia.js + Bun (gateway API)
│   └── src/
│       ├── config/     # S3 client config
│       ├── routes/     # API endpoints
│       └── services/   # Upload/download logic
├── datalake/           # Garage config (S3-compatible object storage)
├── compose.dev.yaml    # Semua layanan (development)
├── compose.server.yaml # Backend + datalake (server)
├── compose.client.yaml # Frontend saja (client)
└── .env.example        # Template konfigurasi
```

## Scripts

### Frontend (`frontend/`)

| Perintah | Deskripsi |
|----------|-----------|
| `npm run dev` | Development server (Vite, hot reload) |
| `npm run build` | Build produksi (tsc + Vite) |
| `npm run test` | Vitest (watch mode) |
| `npm run test:run` | Vitest (single run) |
| `npm run test:coverage` | Vitest dengan coverage |
| `npm run test:hash:compare` | Benchmark MD5 vs SHA-256 |
| `npm run preview` | Preview hasil build |

### Backend (`backend/`)

| Perintah | Deskripsi |
|----------|-----------|
| `bun dev` | Development server (watch mode) |
| `bun test` | Jalankan backend tests |

## Testing

- **Frontend:** 75 tests (vitest + jsdom + testing-library)
- **Backend:**  13 tests (bun test, S3 client mock)
- **Total:**    88 tests

## Environment Variables

Lihat `.env.example` untuk daftar lengkap variabel yang dibutuhkan.
