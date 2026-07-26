# Database Schema

## Status saat ini

Versi 1 tidak menggunakan database. Pipeline bersifat stateless: request diproses, lalu hasil langsung dikembalikan ke client.

## Rekomendasi saat persistence ditambahkan

Gunakan tabel/collection berikut:

| Entitas | Field inti | Tujuan |
| --- | --- | --- |
| `campaigns` | `id`, `user_id`, `brief`, `context`, `status`, timestamps | Menyimpan request dan status proses. |
| `agent_runs` | `id`, `campaign_id`, `agent_name`, `prompt_version`, `input_json`, `output_json`, `latency_ms`, `status` | Audit setiap stage agent. |
| `prompt_versions` | `id`, `agent_name`, `content`, `checksum`, `published_at` | Reproduksibilitas hasil saat prompt berubah. |

Simpan API key dan secret hanya di environment atau secret manager, tidak pernah dalam tabel aplikasi.
