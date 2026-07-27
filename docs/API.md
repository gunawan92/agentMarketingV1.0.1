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
