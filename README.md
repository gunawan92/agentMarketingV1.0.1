# Single Chain Marketing Agent Pipeline

Backend Express.js ini menjalankan enam Marketing AI Agent secara synchronous dalam satu rantai:

```text
Strategy
  → Copywriter
  → Design
  → Publisher Draft
  → Ads Draft
  → CRM Initial Plan
```

Output setiap agent menjadi konteks untuk agent berikutnya. Jika satu stage wajib gagal, pipeline berhenti dan response menyebutkan `pipeline_id` serta stage yang gagal. Ads dapat dilewati dengan mengirim `ads.enabled: false`.

Versi ini merupakan pembuktian alur end-to-end berbasis draft JSON:

- Design hanya membuat arahan visual dan prompt; belum membuat gambar fisik.
- Publisher hanya membuat draft payload; belum mempublikasikan konten.
- Ads hanya membuat draft media plan; belum mengaktifkan campaign.
- CRM hanya membuat measurement/follow-up plan; belum mengirim pesan.
- Tidak ada webhook, platform sosial, Ads Manager, CRM eksternal, atau image-generation API yang dipanggil.

## Menjalankan aplikasi

Persyaratan: Node.js 20 atau lebih baru.

```bash
npm install
<<<<<<< HEAD
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
=======
cp .env.example .env
npm start
```

Environment utama:

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
AI_TIMEOUT_MS=60000
AI_MAX_RETRIES=1
PORT=3000
```

`OPENAI_KEY`, `OPENAI_CHAT_MODEL`, dan `OPENAI_API_BASE` tetap didukung sebagai nama lama.

Health check tersedia di `GET /health`.

## Contoh request
>>>>>>> 94a9071b743c6db25f8fd911589bff10ba051f7c

```bash
curl -X POST http://localhost:3000/api/generate-campaign \
  -H "Content-Type: application/json" \
  -d '{
    "campaignBrief": "Promosikan platform manajemen sekolah STELA kepada yayasan dan kepala sekolah.",
    "product": {
      "name": "STELA",
      "description": "Platform manajemen sekolah yang menghubungkan operasional sekolah dan orang tua.",
      "known_facts": ["STELA digunakan untuk membantu pengelolaan sekolah."],
      "prohibited_claims": [
        "Jangan mengarang jumlah pengguna.",
        "Jangan menjanjikan penghematan tertentu."
      ]
    },
    "campaign": {
      "goal": "Menghasilkan permintaan demo.",
      "duration_days": 30,
      "start_date": "2026-08-01"
    },
    "target_audience": "Yayasan dan kepala sekolah di Indonesia.",
    "platforms": ["Instagram", "LinkedIn"],
    "tone_of_voice": "Profesional, terpercaya, dan mudah dipahami.",
    "publishing": { "timezone": "Asia/Jakarta" },
    "ads": {
      "enabled": true,
      "budget": {
        "amount": 5000000,
        "currency": "IDR",
        "period_days": 30
      },
      "platforms": ["Meta Ads"]
    }
  }'
```

Satu-satunya field wajib adalah `campaignBrief`: string yang setelah di-trim memiliki 20–20000 karakter.

<<<<<<< HEAD
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
=======
Dokumentasi tambahan tersedia di folder [`docs/`](docs/), termasuk [API reference](docs/API.md) dan [arsitektur](docs/ARCHITECTURE.md).
>>>>>>> 94a9071b743c6db25f8fd911589bff10ba051f7c
