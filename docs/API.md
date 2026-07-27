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

## Wizard API

Semua endpoint Wizard menerima `Content-Type: application/json` dan hanya menjalankan satu stage. Simpan respons stage yang sudah di-approve di frontend/Project Manager, lalu kirim kembali pada stage berikutnya.

| Endpoint | Input wajib | Output |
| --- | --- | --- |
| `POST /api/wizard/strategy` | `campaignBrief`, `targetAudience`, `campaignDuration` | `strategy` dan content calendar. |
| `POST /api/wizard/copy` | `campaignBrief`, `strategy`, `selectedContentItem`, `platform`, `toneOfVoice`, `language` | `copy` untuk satu item kalender yang dipilih. |
| `POST /api/wizard/design` | `copy`, `assetDimension` | `design` dan English image prompt. |
| `POST /api/wizard/publisher` | `copy`, `visualAsset`, `platform`, `timezone` | `publication` payload; tidak melakukan publish nyata. |
| `POST /api/wizard/ads` | `copy`, `visualAsset`, `budget` | `ads` A/B matrix dan targeting. |
| `POST /api/wizard/crm` | `analytics` atau `customerTrigger` | `crm` evaluation dan follow-up draft. |

Contoh memilih item kalender Day 1 untuk Copywriter:

```json
{
  "campaignBrief": "Promosikan cold brew premium untuk pekerja kreatif Jakarta.",
  "strategy": { "campaign_goal": "...", "content_calendar": [] },
  "selectedContentItem": {
    "date": "Day 1",
    "main_angle": "Perkenalan produk sebagai solusi energi.",
    "format": "Image",
    "call_to_action": "Follow untuk info lebih lanjut",
    "rationale": "Membangun awareness awal."
  },
  "platform": "Instagram Feed",
  "toneOfVoice": "santai",
  "language": "Bahasa Indonesia"
}
```

## Persistent Campaign API

Gunakan API ini untuk wizard yang dapat di-resume setelah browser/server terputus. Hasil agent dan approval tersimpan pada PostgreSQL schema `marketing_ai`.

| Endpoint | Fungsi |
| --- | --- |
| `POST /api/campaigns` | Buat campaign persistent dengan `{ "brief": { ... } }`. |
| `GET /api/campaigns/:campaignId` | Ambil campaign, seluruh stage run, approval, asset, dan publication job. |
| `POST /api/campaigns/:campaignId/stages/:stage` | Jalankan satu stage dengan `{ "input": { ... } }`. Stage: `strategy`, `copywriter`, `design`, `publisher`, `ads`, `crm`. |
| `POST /api/campaigns/:campaignId/approvals` | Simpan keputusan PM atas stage run. |

Setiap eksekusi stage tersimpan sebagai `attempt` baru. Saat LLM gagal, record stage menjadi `failed`; PM/FE cukup memanggil endpoint stage yang sama untuk membuat retry tanpa menghapus output attempt sebelumnya.
