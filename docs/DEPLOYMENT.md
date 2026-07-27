# Deployment

## Prasyarat

- Node.js 20 atau lebih baru.
- Environment variables: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `CORS_ORIGIN`, dan `PORT` bila menggunakan OpenRouter.
- PM2 tersedia global: `npm install -g pm2`.

## Linux dengan PM2

```bash
git clone <repository-url> marketing-ai-agent
cd marketing-ai-agent
npm ci --omit=dev
cp .env.production.example .env.production
# edit .env.production dan isi OpenRouter/OpenAI key serta DATABASE_URL
npm run pm2:start
pm2 save
pm2 startup
```

`ecosystem.config.js` menggunakan cluster mode dengan jumlah instance sesuai CPU. `pm2:start` memakai `env_production`, sehingga aplikasi memuat **hanya** `.env.production`; `pm2:dev` memakai `env_development` dan memuat **hanya** `.env.development`. File `.env` tidak digunakan oleh aplikasi. Untuk melihat log gunakan `pm2 logs marketing-ai-agent`; untuk reload production gunakan `npm run pm2:reload`.

## Reverse proxy

Letakkan Nginx atau reverse proxy setara di depan Node.js untuk TLS, domain, dan request-size limit. Proxy harus meneruskan `Content-Type` dan, bila diperlukan, header autentikasi.

## Environment variables

| Variable | Wajib | Keterangan |
| --- | --- | --- |
| `OPENAI_API_KEY` | Ya | API key provider. |
| `OPENAI_MODEL` | Tidak | Default `gpt-4o-mini`. |
| `OPENROUTER_API_KEY` | Untuk OpenRouter | API key OpenRouter; diprioritaskan saat tersedia. |
| `OPENROUTER_MODEL` | Untuk OpenRouter | Model slug OpenRouter; diprioritaskan atas `OPENAI_MODEL`. |
| `AI_MAX_TOKENS` | Tidak | Batas token respons; gunakan `4096` untuk router free yang dapat memilih reasoning model. |
| `OPENAI_BASE_URL` | Tidak | Base URL provider compatible. |
| `AI_TIMEOUT_MS` | Tidak | Default `30000`. |
| `DATABASE_URL` | Produksi | URI PostgreSQL tunggal; gunakan URI Neon dengan `?sslmode=require`. |
| `PGPOOL_MAX` | Tidak | Maksimum koneksi PostgreSQL per process PM2, default `5`. |
| `CORS_ORIGIN` | Produksi | Daftar origin dipisah koma. |
| `PORT` | Tidak | Default `3000`. |

## Development dengan OpenRouter

Salin `.env.development.example` menjadi `.env.development`, isi `OPENROUTER_API_KEY` dengan key OpenRouter, lalu jalankan `npm run dev`. Aplikasi menggunakan OpenAI SDK yang diarahkan ke `https://openrouter.ai/api/v1`; atur `OPENROUTER_MODEL` (default development: `openrouter/free`). File `.env.development` diabaikan Git.

Jika OpenRouter merespons `No endpoints available matching your guardrail restrictions and data policy`, buka Settings > Privacy pada akun OpenRouter. Kebijakan data, Zero Data Retention, serta model/provider allowlist dapat mengeluarkan seluruh endpoint yang tersedia untuk `openrouter/free`. Longgarkan restriction untuk development atau pilih model yang diizinkan oleh kebijakan tersebut.

## PostgreSQL local

Set `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, dan `PGPASSWORD` di `.env.development`. Bila database target belum ada, jalankan `npm run db:create`, lalu jalankan `npm run db:migrate`. Migration membuat tabel aplikasi di schema `marketing_ai`.

## PostgreSQL Neon (production)

Set **satu** variable di `.env.production`, tanpa tanda kutip dan tanpa baris terpisah:

```dotenv
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
PGPOOL_MAX=5
```

`DATABASE_URL` diprioritaskan atas seluruh `PGHOST`/`PGDATABASE` fallback. Jalankan `NODE_ENV=production npm run db:migrate` sekali sebelum start PM2. Jangan gunakan kredensial PostgreSQL yang sudah pernah ditempel ke chat atau commit; rotate dahulu di dashboard provider.
