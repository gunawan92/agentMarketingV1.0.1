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

Every retry creates a new `attempt`; previous successful or failed output remains available for audit.

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
