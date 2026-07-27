# API Reference

## Health

`GET /health`

```json
{ "status": "ok" }
```

## Generate campaign

`POST /api/generate-campaign`

Menjalankan Strategy → Copywriter → Design → Publisher Draft → Ads Draft → CRM Initial Plan secara berurutan. `campaignBrief` wajib berupa string 20–20000 karakter. Field lain bersifat optional untuk backward compatibility.

Request minimum:

```json
{
  "campaignBrief": "Promosikan STELA kepada yayasan dan kepala sekolah di Indonesia."
}
```

Untuk melewati Ads Agent:

```json
{
  "campaignBrief": "Promosikan STELA kepada yayasan dan kepala sekolah di Indonesia.",
  "ads": { "enabled": false }
}
```

Response sukses (diringkas):

<<<<<<< HEAD
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
=======
```json
{
  "success": true,
  "data": {
    "pipeline_id": "uuid",
    "status": "completed",
    "campaign_request": {},
    "results": {
      "strategy": {},
      "copywriting": {},
      "design": { "asset_generation_status": "not_generated" },
      "publishing": { "status": "requires_asset" },
      "ads": { "status": "draft", "asset_status": "pending" },
      "crm": { "evaluation_status": "awaiting_data" }
    },
    "execution": {
      "started_at": "2026-07-27T00:00:00.000Z",
      "completed_at": "2026-07-27T00:00:10.000Z",
      "duration_ms": 10000,
      "agents": [
        {
          "agent": "strategy",
          "status": "completed",
          "duration_ms": 1200,
          "model": "gpt-4o-mini",
          "response_id": "response-id-or-null"
        }
      ]
    }
  }
}
```

Jika Ads dinonaktifkan, hasil dan trace Ads berstatus `skipped`. Bila budget Ads tidak tersedia tetapi Ads aktif, agent tetap dijalankan dan status hasil dinormalisasi menjadi `requires_budget`.

Response kegagalan stage:

```json
{
  "success": false,
  "error": {
    "code": "PIPELINE_STAGE_FAILED",
    "message": "Pipeline failed at design stage.",
    "pipeline_id": "uuid",
    "stage": "design",
    "details": null
  }
}
```

Pipeline berhenti saat stage wajib gagal. Raw response OpenAI dan system prompt tidak ditampilkan dalam production.

Semua hasil merupakan draft JSON. Design tidak menghasilkan file, Publisher tidak menerbitkan konten, Ads tidak mengaktifkan campaign, dan CRM tidak mengirim follow-up.
>>>>>>> 94a9071b743c6db25f8fd911589bff10ba051f7c
