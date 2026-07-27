# Database Schema

## Status saat ini

Wizard API saat ini masih stateless. Arsitektur PostgreSQL yang akan menggantikan model ini tersedia di [Persistent Campaign Wizard Architecture](PERSISTENCE_ARCHITECTURE.md). PostgreSQL akan menjadi source of truth agar campaign dapat di-resume tanpa generate ulang.

## Rekomendasi saat persistence ditambahkan

Gunakan tabel/collection berikut:

| Entitas | Field inti | Tujuan |
| --- | --- | --- |
| `campaigns` | `id`, `user_id`, `brief`, `context`, `status`, timestamps | Menyimpan request dan status proses. |
| `agent_runs` | `id`, `campaign_id`, `agent_name`, `prompt_version`, `input_json`, `output_json`, `latency_ms`, `status` | Audit setiap stage agent. |
| `prompt_versions` | `id`, `agent_name`, `content`, `checksum`, `published_at` | Reproduksibilitas hasil saat prompt berubah. |

Simpan API key dan secret hanya di environment atau secret manager, tidak pernah dalam tabel aplikasi.
