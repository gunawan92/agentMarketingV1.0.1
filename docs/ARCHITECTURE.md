# Architecture

## Overview

```text
Client
  -> POST /api/generate-campaign
  -> pipeline controller
     -> read src/skills/agent-strategy.md -> LLM -> strategy JSON
     -> read src/skills/agent-copywriter.md -> LLM -> copy JSON
  -> JSON response
```

## Komponen

| Komponen | Tanggung jawab |
| --- | --- |
| `src/app.js` | Middleware CORS, parser JSON, routes, dan error handler. |
| `src/server.js` | Memuat environment dan menjalankan HTTP server. |
| `src/routes/pipeline.routes.js` | Mendefinisikan endpoint API. |
| `src/controllers/pipeline.controller.js` | Mengatur urutan agent dan membaca prompt Markdown secara dinamis. |
| `src/services/ai.service.js` | Memanggil LLM, menerapkan timeout, dan memvalidasi JSON. |
| `src/skills/*.md` | Kontrak perilaku, batasan, dan schema output agent. |

## Prinsip desain

- Output sebuah agent menjadi input agent berikutnya.
- Prompt adalah konfigurasi version-controlled, bukan hard-coded di controller.
- Service LLM tidak mengetahui domain campaign; ia hanya menerima system dan user prompt.
- Controller mengembalikan output per tahap agar mudah diaudit dan di-debug.

## Menambah agent

Tambahkan file prompt di `src/skills/`, kemudian di controller baca prompt tersebut dan kirim output stage sebelumnya sebagai `userPrompt`. Pastikan prompt baru mendefinisikan schema JSON object yang eksplisit.
