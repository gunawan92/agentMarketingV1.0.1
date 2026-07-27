# Persistent Campaign Wizard Architecture

## Tujuan

Wizard tidak boleh kehilangan hasil ketika browser refresh, request timeout, server restart, atau user berhenti di tengah proses. PostgreSQL menjadi source of truth untuk campaign, input/output setiap agent, approval, asset, dan error.

## Alur persistent

```text
FE creates campaign
  -> PostgreSQL: campaigns = draft
  -> run Strategy
  -> PostgreSQL: campaign_stages(strategy) = awaiting_approval
  -> PM approves and selects a calendar item
  -> run Copy -> Design -> asset upload -> Publisher / Ads
  -> PostgreSQL records each stage and artefact
  -> CRM consumes persisted campaign + performance analytics
```

Jika proses berhenti, FE memanggil detail campaign lalu melanjutkan dari stage terakhir yang statusnya `awaiting_approval`, `failed`, atau `queued`. Hasil stage yang sudah `completed` tidak digenerate ulang.

## Status campaign

| Status | Makna |
| --- | --- |
| `draft` | Brief dibuat, belum menjalankan agent. |
| `in_progress` | Ada stage yang sedang diproses. |
| `awaiting_approval` | Output agent tersedia dan menunggu keputusan PM. |
| `ready_to_publish` | Copy, design, dan visual asset telah di-approve. |
| `published` | Scheduler/webhook eksternal mengonfirmasi publish. |
| `failed` | Stage terakhir gagal; campaign dapat di-retry. |
| `archived` | Campaign ditutup tanpa proses lanjutan. |

## Tabel PostgreSQL

### `campaigns`

Satu record per campaign.

```text
id UUID PK
status VARCHAR
current_stage VARCHAR NULL
brief JSONB
created_by VARCHAR NULL
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### `campaign_stages`

Immutable audit trail untuk setiap agent run dan retry.

```text
id UUID PK
campaign_id UUID FK campaigns.id
stage VARCHAR                 -- strategy, copywriter, design, publisher, ads, crm
attempt INTEGER
status VARCHAR                -- queued, running, completed, failed, awaiting_approval
input JSONB
output JSONB NULL
error JSONB NULL
request_id UUID NULL
model VARCHAR NULL
prompt_checksum VARCHAR NULL
started_at TIMESTAMPTZ NULL
completed_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ
UNIQUE (campaign_id, stage, attempt)
```

### `campaign_approvals`

Mencatat keputusan Project Manager, termasuk item kalender yang dipilih.

```text
id UUID PK
campaign_id UUID FK campaigns.id
stage_run_id UUID FK campaign_stages.id
decision VARCHAR              -- approved, rejected, revision_requested
selected_content_item JSONB NULL
note TEXT NULL
approved_by VARCHAR NULL
created_at TIMESTAMPTZ
```

### `campaign_assets`

Metadata gambar/asset setelah image provider atau uploader menghasilkan file nyata.

```text
id UUID PK
campaign_id UUID FK campaigns.id
stage_run_id UUID FK campaign_stages.id
asset_type VARCHAR
storage_url TEXT
mime_type VARCHAR
width INTEGER NULL
height INTEGER NULL
metadata JSONB
created_at TIMESTAMPTZ
```

### `publication_jobs`

Outbox untuk scheduler/webhook agar publish dapat di-retry secara aman.

```text
id UUID PK
campaign_id UUID FK campaigns.id
payload JSONB
status VARCHAR                -- pending, processing, published, failed
idempotency_key UUID UNIQUE
scheduled_at TIMESTAMPTZ
published_at TIMESTAMPTZ NULL
error JSONB NULL
created_at TIMESTAMPTZ
```

## API persistent yang akan ditambahkan

| Endpoint | Tujuan |
| --- | --- |
| `POST /api/campaigns` | Membuat campaign dan menyimpan brief. |
| `GET /api/campaigns/:campaignId` | Mengembalikan state lengkap untuk resume FE. |
| `POST /api/campaigns/:campaignId/stages/strategy` | Menjalankan dan menyimpan stage Strategy. |
| `POST /api/campaigns/:campaignId/approvals` | PM approve/reject dan menyimpan selected content item. |
| `POST /api/campaigns/:campaignId/stages/:stage` | Menjalankan Copy, Design, Publisher, Ads, atau CRM dari artefak yang di-approve. |
| `POST /api/campaigns/:campaignId/stages/:stage/retry` | Membuat attempt baru, tidak menimpa output lama. |

## Reliability rules

- FE mengirim `Idempotency-Key` untuk create, stage run, approval, dan publish.
- Stage output disimpan atomically sebelum respons dikirim ke FE.
- Retry hanya membuat `attempt` baru; output sukses lama tidak ditimpa.
- Panggilan LLM jangka panjang dijalankan oleh worker/job queue pada implementasi production. HTTP hanya membuat job dan mengembalikan status.
- Publish memakai outbox `publication_jobs`, sehingga server restart tidak menghilangkan job terjadwal.
- Log memakai `requestId`, `campaignId`, dan `stageRunId` untuk trace end-to-end.
