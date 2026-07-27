# API Reference

Base URL local: `http://localhost:3000`

## Health

`GET /health` returns `{ "status": "ok" }`.

## Synchronous six-agent pipeline

`POST /api/generate-campaign`

```json
{
  "campaignBrief": "Promosikan French Khimar Premium untuk muslimah Indonesia.",
  "ads": { "enabled": true, "budget": { "total": 245000, "currency": "IDR" } }
}
```

This route returns a draft six-agent result. It does not create a real image, publish social content, create an ad, or send CRM messages.

## Persistent Campaign API

Use this API for the production frontend wizard. Data is saved in PostgreSQL schema `marketing_ai`.

| Endpoint | Function |
| --- | --- |
| `POST /api/campaigns` | Create a persisted campaign with `{ "brief": { ... } }`. |
| `GET /api/campaigns/:campaignId` | Resume campaign state, stage runs, approvals, assets, and publication jobs. |
| `POST /api/campaigns/:campaignId/stages/:stage` | Run a persisted stage with `{ "input": { ... } }`. Valid stages: `strategy`, `copywriter`, `design`, `publisher`, `ads`, `crm`. |
| `POST /api/campaigns/:campaignId/approvals` | Save PM approval or revision decision. |
| `POST /api/campaigns/:campaignId/assets` | Upload an image asset (`multipart/form-data`, field name `asset`). |
| `POST /api/campaigns/:campaignId/assets/link` | Attach a direct external image URL (not a product or landing-page URL). |

Every retry creates a new `attempt`; previous successful or failed output remains available for audit.

### Upload an image asset

`POST /api/campaigns/:campaignId/assets`

Send `multipart/form-data`; do not manually set the `Content-Type` header. Accepted formats are PNG, JPG/JPEG, WebP, GIF, and AVIF, up to 10 MB.

| Field | Required | Description |
| --- | --- | --- |
| `asset` | Yes | Image file. |
| `stageRunId` | No | The design stage run UUID that produced the asset. |
| `altText` | No | Accessibility description. |

The `201` response contains `asset.storage_url`. Use this URL for the FE `<img>` preview and for the publisher payload. The API records the asset in PostgreSQL and serves its local development URL under `/storage/campaign-assets/`.

## Stateless Wizard API

`/api/wizard/strategy`, `/copy`, `/design`, `/publisher`, `/ads`, and `/crm` run one stage at a time but do not save campaign data. Use only for prototypes.

## Errors

| Status | Meaning |
| --- | --- |
| 400 | Invalid request input. |
| 404 | Route, campaign, or stage run was not found. |
| 500 | Server configuration or skill file error. |
| 502 | AI provider failed or returned invalid JSON. |
| 504 | AI provider timeout. |
