# Deployment

## Prasyarat

- Node.js 20 atau lebih baru.
- Environment variables: `OPENAI_API_KEY`, `OPENAI_MODEL`, `CORS_ORIGIN`, dan `PORT` bila diperlukan.
- PM2 tersedia global: `npm install -g pm2`.

## Linux dengan PM2

```bash
git clone <repository-url> marketing-ai-agent
cd marketing-ai-agent
npm ci --omit=dev
cp .env.example .env
# edit .env dan isi OPENAI_API_KEY
npm run pm2:start
pm2 save
pm2 startup
```

`ecosystem.config.js` menggunakan cluster mode dengan jumlah instance sesuai CPU. Untuk melihat log gunakan `pm2 logs marketing-ai-agent`; untuk reload gunakan `npm run pm2:reload`.

## Reverse proxy

Letakkan Nginx atau reverse proxy setara di depan Node.js untuk TLS, domain, dan request-size limit. Proxy harus meneruskan `Content-Type` dan, bila diperlukan, header autentikasi.

## Environment variables

| Variable | Wajib | Keterangan |
| --- | --- | --- |
| `OPENAI_API_KEY` | Ya | API key provider. |
| `OPENAI_MODEL` | Tidak | Default `gpt-4o-mini`. |
| `OPENAI_BASE_URL` | Tidak | Base URL provider compatible. |
| `AI_TIMEOUT_MS` | Tidak | Default `30000`. |
| `CORS_ORIGIN` | Produksi | Daftar origin dipisah koma. |
| `PORT` | Tidak | Default `3000`. |
