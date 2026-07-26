# Marketing AI Agent Ecosystem

Backend Express.js untuk menjalankan pipeline AI marketing: Strategy Agent menghasilkan strategi, lalu Copywriter Agent mengubah strategi tersebut menjadi materi kampanye. System prompt setiap agent disimpan sebagai Markdown di `src/skills/`.

## Mulai cepat

```bash
npm install
copy .env.example .env
# Isi OPENAI_API_KEY dalam .env
npm run dev
```

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
- [Database schema](docs/DATABASE_SCHEMA.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Security](docs/SECURITY.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Changelog](docs/CHANGELOG.md)
