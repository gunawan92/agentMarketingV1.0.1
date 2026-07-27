# Marketing AI Agent Ecosystem

Backend Express.js untuk menjalankan pipeline AI marketing: Strategy Agent menghasilkan strategi, lalu Copywriter Agent mengubah strategi tersebut menjadi materi kampanye. System prompt setiap agent disimpan sebagai Markdown di `src/skills/`.

## Mulai cepat

```bash
npm install
copy .env.development.example .env.development
# Isi OPENROUTER_API_KEY yang baru dalam .env.development
npm run dev
```

`npm run dev` memuat `.env` lalu `.env.development`. Untuk OpenRouter gunakan `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, dan `OPENAI_BASE_URL=https://openrouter.ai/api/v1`. `OPENROUTER_MODEL` diprioritaskan atas `OPENAI_MODEL`; nilai development default adalah `openrouter/free`. `OPENAI_API_KEY` juga tetap didukung untuk kompatibilitas.

## Environment workspace

| File | Digunakan oleh | Fungsi |
| --- | --- | --- |
| `.env` | Semua environment | Nilai bersama non-rahasia, misalnya port dan timeout. |
| `.env.development` | `NODE_ENV=development` / `npm run dev` | Konfigurasi lokal OpenRouter. |
| `.env.production` | `NODE_ENV=production` / PM2 production | Credential dan origin production. |

File environment aktual diabaikan Git. Template yang aman untuk dibagikan tersedia sebagai `.env.example`, `.env.development.example`, dan `.env.production.example`.

## Logs

Setiap proses server, request, pipeline, skill loading, LLM call, error, dan shutdown menghasilkan log terstruktur melalui `console.log`. Gunakan `npm start` atau `npm run dev` dan perhatikan event seperti `server.started`, `pipeline.started`, `ai.request.started`, serta `ai.request.failed` untuk menemukan stage yang berhenti. Event `server.configuration.loaded` menampilkan `apiKeyStatus` sebagai `configured`, `placeholder`, atau `missing` tanpa pernah mencetak key.

Uji endpoint:

```bash
curl -X POST http://localhost:3000/api/generate-campaign \
  -H "Content-Type: application/json" \
  -d '{"campaignBrief":"Launch a healthy meal-prep subscription for busy professionals in Bangkok.","language":"English"}'
```

Dokumentasi lengkap tersedia di folder [`docs/`](docs/):

- [PRD](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Frontend integration handoff](docs/FRONTEND_INTEGRATION.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [Persistent wizard architecture](docs/PERSISTENCE_ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Security](docs/SECURITY.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Changelog](docs/CHANGELOG.md)
