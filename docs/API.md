# API Reference

Base URL lokal: `http://localhost:3000`

## Health check

`GET /health`

Respons `200`:

```json
{ "status": "ok" }
```

## Generate campaign

`POST /api/generate-campaign`

Header: `Content-Type: application/json`

Request minimal:

```json
{
  "campaignBrief": "Promosikan aplikasi kasir untuk UMKM kuliner di Indonesia."
}
```

Field tambahan diteruskan sebagai `context`, misalnya `language`, `product`, `budget`, `channels`, atau `brandVoice`.

Respons `200`:

```json
{
  "strategy": { "campaign_goal": "...", "key_messages": ["..."] },
  "copy": { "headline_options": ["..."], "primary_copy": "..." }
}
```

Error umum:

| Status | Arti |
| --- | --- |
| 400 | `campaignBrief` kosong atau bukan string. |
| 404 | Route tidak tersedia. |
| 500 | Konfigurasi server atau skill file bermasalah. |
| 502 | Provider LLM gagal atau memberi JSON tidak valid. |
| 504 | Request LLM melebihi `AI_TIMEOUT_MS`. |
