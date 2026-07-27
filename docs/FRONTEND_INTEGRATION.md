# Frontend Integration Handoff

## Tujuan

Frontend membangun wizard campaign dengan approval gate per stage. Backend bersifat stateless: FE/Project Manager harus menyimpan respons stage yang sudah disetujui dan meneruskannya ke stage selanjutnya.

> **Production persistence notice:** Untuk production, gunakan Persistent Campaign API (`/api/campaigns/*`). Data campaign, output setiap agent, error, approval PM, dan metadata asset akan disimpan di PostgreSQL database `agent_marketing`, schema `marketing_ai`. Endpoint `/api/wizard/*` hanya untuk prototype/stateless dan tidak menyimpan data.

## Base URL dan headers

Development base URL: `http://localhost:3000`

Dalam development backend menerima origin `localhost` atau `127.0.0.1` pada port mana pun. Production hanya menerima origin yang tercantum secara eksplisit pada `CORS_ORIGIN`.

Semua request menggunakan:

```http
Content-Type: application/json
X-Request-Id: <uuid-atau-id-yang-dibuat-FE>
```

`X-Request-Id` opsional, tetapi direkomendasikan agar FE dapat mencocokkan error dengan log backend. Backend juga mengembalikan header `X-Request-Id`.

## Alur wizard

```text
Campaign Brief Form
  -> POST /api/wizard/strategy
  -> render & approve content_calendar
  -> pilih tepat satu content calendar item
  -> POST /api/wizard/copy
  -> review & approve copy
  -> POST /api/wizard/design
  -> generate/upload asset visual di FE/integrasi image provider
  -> POST /api/wizard/publisher atau /api/wizard/ads
  -> setelah hasil campaign tersedia: POST /api/wizard/crm
```

Jangan otomatis membuat copy untuk semua kalender konten. User/PM memilih satu item, lalu FE menjalankan tahap Copy dan Design untuk item tersebut.

## Mode persistent (wajib untuk production)

Gunakan Persistent Campaign API, bukan endpoint stateless `/api/wizard/*`, agar refresh browser atau proses yang gagal dapat di-resume.

1. Buat record: `POST /api/campaigns` dengan `{ "brief": { ... } }`; simpan `campaign.id`.
2. Jalankan stage: `POST /api/campaigns/:campaignId/stages/strategy` dengan `{ "input": { ... } }`.
3. Tampilkan `output`, lalu Project Manager menyimpan approval melalui `POST /api/campaigns/:campaignId/approvals`.
4. Saat halaman dimuat kembali, panggil `GET /api/campaigns/:campaignId` dan render output dari `stages` terakhir.
5. Untuk retry, kirim ulang endpoint stage yang sama. Backend menyimpan `attempt` baru tanpa menghapus output sebelumnya.

### Data yang tersimpan

| Aksi FE | Penyimpanan PostgreSQL |
| --- | --- |
| Membuat campaign | `marketing_ai.campaigns`: brief, status, current stage. |
| Menjalankan Strategy/Copy/Design/Ads/CRM | `marketing_ai.campaign_stages`: input, output, error, model, prompt checksum, attempt. |
| PM approve/reject | `marketing_ai.campaign_approvals`: keputusan, catatan, selected calendar item. |
| Upload asset melalui Asset API (akan ditambahkan) | `marketing_ai.campaign_assets`: URL file dan metadata. |
| Menyiapkan publish | `marketing_ai.publication_jobs`: payload dan status delivery. |

FE harus menyimpan `campaignId` pada local state dan URL route, misalnya `/campaigns/:campaignId`. Saat browser refresh, panggil `GET /api/campaigns/:campaignId`; jangan generate ulang stage yang telah sukses.

Contoh membuat campaign:

```js
const { data } = await callApi('/api/campaigns', {
  method: 'POST',
  body: { brief: campaignWizard.brief }
});
campaignWizard.campaignId = data.campaign.id;
```

Contoh menjalankan Strategy persistent:

```js
const { data } = await callApi(
  `/api/campaigns/${campaignWizard.campaignId}/stages/strategy`,
  {
    method: 'POST',
    body: {
      input: {
        campaignBrief: campaignWizard.brief.productDescription,
        targetAudience: campaignWizard.brief.targetAudience,
        campaignDuration: campaignWizard.brief.campaignDuration,
        context: campaignWizard.brief
      }
    }
  }
);
campaignWizard.strategyStageRunId = data.stageRun.id;
campaignWizard.strategy = data.output;
```

Contoh approval Project Manager:

```js
await callApi(`/api/campaigns/${campaignWizard.campaignId}/approvals`, {
  method: 'POST',
  body: {
    stageRunId: campaignWizard.strategyStageRunId,
    decision: 'approved',
    selectedContentItem: campaignWizard.selectedContentItem,
    approvedBy: currentUser.name
  }
});
```

## State minimum di FE

```js
const campaignWizard = {
  brief: null,
  strategy: null,
  selectedContentItem: null,
  copy: null,
  design: null,
  visualAsset: null,
  publication: null,
  ads: null,
  crm: null
};
```

Simpan object respons apa adanya. Jangan mengubah nama field snake_case dari respons agent sebelum dikirim kembali ke API.

## 1. Strategy

`POST /api/wizard/strategy`

```json
{
  "campaignBrief": "Promosikan cold brew premium untuk pekerja kreatif di Jakarta.",
  "targetAudience": "Profesional muda dan pekerja kreatif usia 22-35 tahun di Jakarta",
  "campaignDuration": "7 hari",
  "platform": "Instagram Feed",
  "toneOfVoice": "santai",
  "language": "Bahasa Indonesia"
}
```

Respons:

```json
{
  "stage": "strategy",
  "strategy": {
    "content_calendar": []
  }
}
```

UI: render `strategy.content_calendar` sebagai list/table. Saat user memilih satu baris, simpan object utuhnya sebagai `selectedContentItem`.

## 2. Copywriter

`POST /api/wizard/copy`

```json
{
  "campaignBrief": "Promosikan cold brew premium untuk pekerja kreatif di Jakarta.",
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

`selectedContentItem.main_angle`, `format`, dan `call_to_action` wajib ada. Respons sukses mengembalikan `{ "stage": "copywriter", "copy": { ... } }`.

## 3. Design

`POST /api/wizard/design`

```json
{
  "copy": {
    "hook": "...",
    "body_copy": "...",
    "call_to_action": "..."
  },
  "assetDimension": "1:1",
  "platform": "Instagram Feed"
}
```

Respons `{ "stage": "design", "design": { ... } }` berisi `layout_direction`, `legibility_notes`, dan `image_generation_prompt_en`. FE dapat mengirim prompt tersebut ke image-generation workflow, lalu menyimpan metadata asset hasilnya.

## 4. Publisher (menyiapkan payload, belum publish nyata)

`POST /api/wizard/publisher`

```json
{
  "copy": { "body_copy": "...", "hashtags": ["#ColdBrew"] },
  "visualAsset": {
    "path": "https://cdn.example.com/campaigns/cold-brew-day-1.png",
    "altText": "Cold brew di meja kerja kreatif"
  },
  "platform": "Instagram",
  "timezone": "Asia/Jakarta"
}
```

Respons `{ "stage": "publisher", "publication": { ... } }` adalah draft payload. FE/PM harus menampilkan review sebelum diteruskan ke scheduler/webhook yang sebenarnya.

## 5. Ads

`POST /api/wizard/ads`

```json
{
  "copy": { "body_copy": "...", "call_to_action": "Pesan sekarang" },
  "visualAsset": { "path": "https://cdn.example.com/campaigns/cold-brew-day-1.png" },
  "budget": {
    "total": 500000,
    "currency": "IDR",
    "duration": "7 hari"
  }
}
```

Respons `{ "stage": "ads", "ads": { ... } }` berisi matriks A/B dan targeting draft. Ini belum mengirim iklan ke Ads Manager.

## 6. CRM

Kirim salah satu: `analytics` atau `customerTrigger`.

```json
{
  "analytics": {
    "views": 12000,
    "clicks": 320,
    "leads": 18,
    "spend": 500000,
    "revenue": 1250000
  },
  "campaignContext": {
    "campaignName": "Cold Brew Launch Week",
    "platform": "Instagram"
  }
}
```

Respons `{ "stage": "crm", "crm": { ... } }` memuat evaluasi dan draf follow-up.

## Helper fetch

```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export async function callApi(path, { method = 'POST', body } = {}) {
  const requestId = crypto.randomUUID();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return { data, requestId: response.headers.get('X-Request-Id') ?? requestId };
}

export function callWizard(endpoint, payload) {
  return callApi(`/api/wizard/${endpoint}`, { body: payload });
}
```

## Error handling FE

| Status | UI action |
| --- | --- |
| 400 | Tampilkan validasi field di form; jangan retry otomatis. |
| 500 | Tampilkan error konfigurasi server; kirim request ID ke backend team. |
| 502 | Tampilkan kegagalan provider AI dan tombol Retry stage yang sama. |
| 504 | Tampilkan timeout dan tombol Retry stage yang sama. |

Jangan tampilkan `details` error provider ke end user pada production. Tampilkan request ID pada error state untuk investigasi PM/backend.
